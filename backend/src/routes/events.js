const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// helpers
function genToken(len = 12) {
  return crypto.randomBytes(Math.ceil(len * 3 / 4))
    .toString('base64')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, len);
}

const QRS_DIR = path.join(__dirname, '..', '..', 'qrs');

// -----------------------------
// GET all events + token stats
// -----------------------------
router.get('/', async (req, res) => {
  try {
    const q = `
      SELECT 
        e.id,
        e.name,
        e.status,
        COUNT(t.id) AS total_tokens,
        COUNT(t.id) FILTER (WHERE t.used = true) AS used_tokens
      FROM events e
      LEFT JOIN tokens t ON t.event_id = e.id
      GROUP BY e.id
      ORDER BY e.id DESC
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error('list events error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// -----------------------------
// CREATE event + auto tokens
// -----------------------------
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. create event
    const evRes = await client.query(
      `INSERT INTO events (name, status)
       VALUES ($1, 'active')
       RETURNING id, name, status`,
      [name]
    );
    const event = evRes.rows[0];

    // 2. fetch houses
    const housesRes = await client.query(
      `SELECT id FROM houses ORDER BY id`
    );
    const houses = housesRes.rows;

    // ensure QR dir
    await fs.promises.mkdir(QRS_DIR, { recursive: true });

    // 3. generate tokens
    const tokens = [];
    for (const h of houses) {
      const tokenCode = genToken();

      const tRes = await client.query(
        `INSERT INTO tokens (token_code, house_id, event_id, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id, token_code`,
        [tokenCode, h.id, event.id]
      );

      tokens.push(tRes.rows[0]);

      // QR generation (best-effort)
      try {
        const QRCode = require('qrcode');
        const payload = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/token/${tokenCode}`;
        await QRCode.toFile(
          path.join(QRS_DIR, `${tokenCode}.png`),
          payload
        );
      } catch (e) {
        console.warn('QR skipped:', e.message);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      event,
      tokens_generated: tokens.length
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('create event error', err);
    res.status(500).json({ error: 'server_error' });
  } finally {
    client.release();
  }
});

// -----------------------------
// CLOSE / REOPEN event
// -----------------------------
router.post('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'invalid_status' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE events SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('update event status error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;