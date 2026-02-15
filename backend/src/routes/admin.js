// backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

router.get('/tokens', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.id AS token_id,
        t.token_code,
        t.event_id,
        t.house_id,
        t.used,
        t.used_at,
        t.status,
        h.house_code,
        h.owner_name
      FROM tokens t
      LEFT JOIN houses h ON h.id = t.house_id
      ORDER BY t.id DESC
      LIMIT 100
    `);
      router.get('/tokens', (req, res) => {
  console.log('🔥 HIT GET /admin/tokens');
  res.json({ ok: true });
});
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// helper to generate token codes (12 chars)
function genToken(len = 12) {
  return crypto.randomBytes(Math.ceil(len * 3 / 4))
    .toString('base64')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, len);
}

// helper: resolve qrs dir (same as issue-tokens.js)
function qrsDir() {
  return path.join(__dirname, '..', '..', 'qrs'); // adjust if qrs path differs
}

// --- ADMIN: manual checkin (protected route)
router.post('/tokens/:token_code/manual-checkin', async (req, res) => {
  const tokenCode = req.params.token_code;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) ensure token exists and is active and not used
    const tRes = await client.query(
      `SELECT id, token_code, house_id, event_id, used, status
       FROM tokens WHERE token_code = $1 LIMIT 1`,
      [tokenCode]
    );
    if (!tRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found' });
    }
    const token = tRes.rows[0];

    if ((token.status || 'active') !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'not_active', detail: 'Token is not active (revoked or invalid).' });
    }
    if (token.used) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'already_used' });
    }

    // 2) update token as used atomically
    const upd = await client.query(
      `UPDATE tokens SET used = true, used_by = $2, used_at = now(), status = 'used'
       WHERE id = $1 AND used = false
       RETURNING id, token_code, house_id, event_id, used, used_at, status`,
      [token.id, req.body.user_id || null]
    );
    if (!upd.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_or_used' });
    }

    // 3) insert audit
    await client.query(
      `INSERT INTO token_audit (token_id, action, performed_by, details)
       VALUES ($1, 'manual_checkin', $2, $3)`,
      [token.id, req.user?.id || null, JSON.stringify({ by: 'admin-ui', info: req.body })]
    );

    await client.query('COMMIT');
    return res.json({ success: true, token: upd.rows[0] });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('manual-checkin error', e);
    return res.status(500).json({ error: 'server_error', detail: e.message });
  } finally {
    client.release();
  }
});

// --- ADMIN: undo checkin
router.post('/tokens/:token_code/undo-checkin', async (req, res) => {
  const tokenCode = req.params.token_code;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tRes = await client.query(`SELECT id, used FROM tokens WHERE token_code = $1 LIMIT 1`, [tokenCode]);
    if (!tRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found' });
    }
    const token = tRes.rows[0];
    if (!token.used) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'not_used' });
    }

    const upd = await client.query(
      `UPDATE tokens SET used = false, used_by = NULL, used_at = NULL, status = 'active' WHERE id = $1 RETURNING id, token_code, used, status`,
      [token.id]
    );

    await client.query(
      `INSERT INTO token_audit (token_id, action, performed_by, details) VALUES ($1,'undo_checkin',$2,$3)`,
      [token.id, req.user?.id || null, JSON.stringify({ by: 'admin-ui' })]
    );

    await client.query('COMMIT');
    return res.json({ success: true, token: upd.rows[0] });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('undo-checkin error', e);
    return res.status(500).json({ error: 'server_error', detail: e.message });
  } finally {
    client.release();
  }
});

// --- ADMIN: reissue token
// semantics: create a new token code for same house/event, revoke other active tokens
router.post('/tokens/:token_code/reissue', async (req, res) => {
  const oldCode = req.params.token_code;
  const client = await pool.connect();
  const qrs = qrsDir();
  const deleted_files = [];

  try {
    await client.query('BEGIN');

    // find the original token to extract house_id and event_id
    const tRes = await client.query(`SELECT id, house_id, event_id FROM tokens WHERE token_code = $1 LIMIT 1`, [oldCode]);
    if (!tRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found' });
    }
    const t = tRes.rows[0];
    const houseId = t.house_id;
    const eventId = t.event_id;

    // revoke other active tokens for the same house+event (except those already used/revoked)
    // return revoked token rows so we can delete their PNGs afterwards
    const revokeRes = await client.query(
      `UPDATE tokens
         SET status = 'revoked'
       WHERE house_id = $1 AND event_id = $2 AND (status IS NULL OR status = 'active')
         AND used = false
       RETURNING id, token_code`,
      [houseId, eventId]
    );
    const revokedTokens = revokeRes.rows || [];

    // generate a new token and insert it
    let newTokenCode = genToken(12);
    // ensure uniqueness - try a few times
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const insertRes = await client.query(
          `INSERT INTO tokens (token_code, event_id, house_id, status, issued_at)
           VALUES ($1, $2, $3, 'active', now())
           RETURNING id, token_code, event_id, house_id`,
          [newTokenCode, eventId, houseId]
        );
        const newToken = insertRes.rows[0];

        // generate qrcode png for new token synchronously (use QR library in other script)
        // we'll delegate QR creation to the same logic used elsewhere - since we don't
        // want to add QR dependency here, we just return the path and let the existing
        // issue/reissue code that you already have create the QR. But if you'd like
        // QR files created from backend here, require('qrcode') and call QRCode.toFile(...)
        // For safety, attempt to create via qrcode lib if available:
        try {
          // try to dynamically require qrcode if present
          const QRCode = require('qrcode');
          const pngPath = path.join(qrs, `${newToken.token_code}.png`);
          // ensure dir exists
          await fs.promises.mkdir(qrs, { recursive: true });
          // payload
          const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
          const payload = `${base}/token/${newToken.token_code}`;
          await QRCode.toFile(pngPath, payload);
        } catch (qrErr) {
          // QR generation failed or qrcode module not installed; proceed and return png path so caller can generate
          console.warn('QR generation skipped (qrcode module absent or failed):', qrErr && qrErr.message);
        }

        // delete revoked PNGs (best-effort)
        for (const rToken of revokedTokens) {
          const png = path.join(qrs, `${rToken.token_code}.png`);
          try {
            await fs.promises.unlink(png);
            deleted_files.push({ file: png, deleted: true, token_code: rToken.token_code });
          } catch (unlinkErr) {
            deleted_files.push({ file: png, deleted: false, reason: (unlinkErr && unlinkErr.message), token_code: rToken.token_code });
          }
        }

        // commit and return new token details + revoked tokens + deleted_files
        await client.query('COMMIT');

        // return a helpful payload
        return res.json({
          success: true,
          new_token: newToken,
          revoked_tokens: revokedTokens,
          deleted_files
        });
      } catch (insertErr) {
        // unique collision — try again with new token code
        if (insertErr && insertErr.code === '23505') {
          newTokenCode = genToken(12);
          continue;
        } else {
          throw insertErr;
        }
      }
    }

    // if insertion didn't succeed after retries
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'could_not_create_token' });

  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('reissue error', e);
    return res.status(500).json({ error: 'server_error', detail: e.message });
  } finally {
    client.release();
  }
});

// --- other admin endpoints (list tokens etc) should already be in your admin router file.
// Export router
module.exports = router;
