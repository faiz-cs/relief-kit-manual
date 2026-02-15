// backend/src/routes/tokens.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /tokens?event_id=&limit=&offset=  -> admin list for tokens (but public may use GET /tokens/:code)
router.get('/', async (req, res) => {
  try {
    const eventId = req.query.event_id ? parseInt(req.query.event_id, 10) : null;
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const offset = parseInt(req.query.offset, 10) || 0;

    let sql, params;
    if (eventId) {
      sql = `
        SELECT t.token_code, t.used, t.used_at, t.event_id,
               h.owner_name,
               h.house_code, h.address, t.status
        FROM tokens t
        LEFT JOIN houses h ON h.id = t.house_id
        WHERE t.event_id = $1
        ORDER BY t.id DESC
        LIMIT $2 OFFSET $3
      `;
      params = [eventId, limit, offset];
    } else {
      sql = `
        SELECT t.token_code, t.used, t.used_at, t.event_id,
               h.owner_name,
               h.house_code, h.address, t.status
        FROM tokens t
        LEFT JOIN houses h ON h.id = t.house_id
        ORDER BY t.id DESC
        LIMIT $1 OFFSET $2
      `;
      params = [limit, offset];
    }

    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (e) {
    console.error('GET /tokens error', e);
    res.status(500).json({ error: 'server_error', detail: e.message });
  }
});

// GET /tokens/:code  -> return token + event + house info
router.get('/:code', async (req, res) => {
  const code = req.params.code;
  try {
    const q = `
      SELECT
        t.id AS token_id,
        t.token_code,
        t.event_id,
        t.house_id,
        t.used,
        t.used_at,
        e.name AS event_name,
        h.owner_name,
        h.house_code,
        h.address,
        t.status
      FROM tokens t
      LEFT JOIN events e ON e.id = t.event_id
      LEFT JOIN houses h ON h.id = t.house_id
      WHERE t.token_code = $1
      LIMIT 1
    `;
    const r = await pool.query(q, [code]);
    if (!r.rows.length) return res.status(404).json({ error: 'not_found' });
    return res.json(r.rows[0]);
  } catch (e) {
    console.error('GET /tokens/:code error', e);
    return res.status(500).json({ error: 'server_error', detail: e.message });
  }
});

// POST /tokens/:token_code/checkin  -> atomic checkin (public scanner)
router.post('/:token_code/checkin', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Only allow check-in if token is active (status IS NULL OR status='active')
    const { rows } = await client.query(
      `UPDATE tokens
         SET used = true, used_by = $2, used_at = now(), status = 'used'
       WHERE token_code = $1
         AND used = false
         AND (expires_at IS NULL OR expires_at >= now())
         AND (status IS NULL OR status = 'active')
       RETURNING id, house_id, event_id, token_code`,
      [req.params.token_code, req.body.user_id || null]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_or_used_or_inactive' });
    }

    const token = rows[0];

    await client.query(
      `INSERT INTO token_audit (token_id, action, performed_by, details)
       VALUES ($1,'checked_in',$2,$3)`,
      [token.id, req.body.user_id || null, JSON.stringify({ ip: req.ip })]
    );

    await client.query('COMMIT');
    res.json({ success: true, token });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('POST /tokens/:token_code/checkin error', e);
    res.status(500).json({ error: 'checkin_failed', details: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
