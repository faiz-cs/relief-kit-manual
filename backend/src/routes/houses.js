// backend/src/routes/houses.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const csv = require('csv-parse/sync');

/*
DB STRUCTURE (CONFIRMED)
------------------------------------------------
id (auto)
house_code (unique)
owner_name
phone
address
latitude
longitude
notes
created_at (auto)
------------------------------------------------
*/

// -------------------------------------
// Validate CSV Row
// -------------------------------------
function validateRow(row, existingCodes) {
  if (!row.house_code || !row.owner_name) {
    return 'missing_required_fields';
  }

  if (existingCodes.has(row.house_code)) {
    return 'duplicate_house_code';
  }

  return null;
}

// -------------------------------------
// PREVIEW CSV (NO INSERT)
// -------------------------------------
router.post('/preview-csv', async (req, res) => {
  try {
    const { csvText } = req.body;

    if (!csvText) {
      return res.status(400).json({ error: 'csv_required' });
    }

    const records = csv.parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const dbRes = await pool.query(
      `SELECT house_code FROM houses`
    );
    const existingCodes = new Set(dbRes.rows.map(r => r.house_code));

    const preview = [];
    const skipped = [];

    records.forEach((row, index) => {
      const reason = validateRow(row, existingCodes);

      if (reason) {
        skipped.push({
          row: index + 1,
          house_code: row.house_code || null,
          reason
        });
      } else {
        preview.push({
          house_code: row.house_code,
          owner_name: row.owner_name,
          phone: row.phone || null,
          address: row.address || '',
          latitude: row.latitude ? Number(row.latitude) : null,
          longitude: row.longitude ? Number(row.longitude) : null,
          notes: row.notes || ''
        });
      }
    });

    res.json({
      summary: {
        total: records.length,
        valid: preview.length,
        skipped: skipped.length
      },
      preview,
      skipped
    });

  } catch (e) {
    console.error('preview-csv error', e);
    res.status(500).json({
      error: 'server_error',
      detail: e.message
    });
  }
});

// -------------------------------------
// CONFIRM IMPORT (ACTUAL INSERT)
// -------------------------------------
router.post('/import', async (req, res) => {
  const client = await pool.connect();

  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'no_rows_to_import' });
    }

    const res = await client.query(
  `
  INSERT INTO houses
  (house_code, owner_name, phone, address, latitude, longitude, notes)
  VALUES ($1,$2,$3,$4,$5,$6,$7)
  ON CONFLICT (house_code) DO NOTHING
  RETURNING id
  `,
  [
    r.house_code,
    r.owner_name,
    r.phone || null,
    r.address || '',
    r.latitude || null,
    r.longitude || null,
    r.notes || ''
  ]
);

if (res.rowCount === 1) inserted++;

    await client.query('COMMIT');

    res.json({
      success: true,
      inserted
    });

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('import houses error', e);

    res.status(500).json({
      error: 'import_failed',
      detail: e.message
    });

  } finally {
    client.release();
  }
});

module.exports = router;