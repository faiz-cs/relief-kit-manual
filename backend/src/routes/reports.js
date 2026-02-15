const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /admin/reports
 * Returns summary per event
 */
router.get('/', async (req, res) => {
  try {
    const q = `
      SELECT
        e.id AS event_id,
        e.name AS event_name,
        COUNT(t.id) AS total_tokens,
        COUNT(*) FILTER (WHERE t.used = true) AS collected,
        COUNT(*) FILTER (WHERE t.status = 'revoked') AS revoked,
        COUNT(*) FILTER (WHERE t.used = false AND t.status = 'active') AS pending
      FROM events e
      LEFT JOIN tokens t ON t.event_id = e.id
      GROUP BY e.id
      ORDER BY e.id DESC
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error('reports error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /admin/reports/:eventId/csv
 */
router.get('/:eventId/csv', async (req, res) => {
  const { eventId } = req.params;

  try {
    const q = `
      SELECT
        token_code,
        house_id,
        used,
        status,
        used_at
      FROM tokens
      WHERE event_id = $1
      ORDER BY id
    `;
    const { rows } = await pool.query(q, [eventId]);

    let csv = 'token_code,house_id,used,status,used_at\n';
    rows.forEach(r => {
      csv += `${r.token_code},${r.house_id},${r.used},${r.status},${r.used_at || ''}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=event_${eventId}_report.csv`
    );
    res.send(csv);
  } catch (err) {
    console.error('csv error', err);
    res.status(500).json({ error: 'csv_failed' });
  }
});

module.exports = router;