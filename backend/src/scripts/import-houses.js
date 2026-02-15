/**
 * import-houses.js
 * Usage (Run & Debug or launch config): node src/scripts/import-houses.js "C:/path/to/houses.csv"
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
// use the supported sync entrypoint
const { parse } = require('csv-parse/sync');
const { pool } = require('../db');

async function run() {
  try {
    const csvFile = process.argv[2];
    if (!csvFile) {
      console.error('Usage: node import-houses.js <path-to-houses.csv>');
      process.exit(1);
    }

    const absPath = path.resolve(csvFile);
    if (!fs.existsSync(absPath)) {
      console.error('CSV file not found at', absPath);
      process.exit(1);
    }

    console.log('Reading CSV from', absPath);
    const raw = fs.readFileSync(absPath, { encoding: 'utf8' });
    const rows = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log('Parsed rows:', rows.length);

    for (const r of rows) {
      const house_code = (r.house_code || r.houseCode || r.HouseCode || '').toString().trim();
      if (!house_code) { console.warn('skipping row without house_code'); continue; }

      const q = `INSERT INTO houses (house_code, head_of_household, phone, address, latitude, longitude, notes)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)
                 ON CONFLICT (house_code) DO UPDATE
                   SET head_of_household = EXCLUDED.head_of_household,
                       phone = EXCLUDED.phone,
                       address = EXCLUDED.address,
                       latitude = EXCLUDED.latitude,
                       longitude = EXCLUDED.longitude,
                       notes = EXCLUDED.notes`;
      const vals = [
        house_code,
        r.head_of_household || r.name || '',
        r.phone || '',
        r.address || '',
        r.latitude || null,
        r.longitude || null,
        r.notes || ''
      ];
      try {
        await pool.query(q, vals);
      } catch (e) {
        console.error('DB error for', house_code, e.message);
      }
    }

    console.log('Import complete');
  } catch (err) {
    console.error('Import failed:', err && err.stack ? err.stack : err);
  } finally {
    try { await pool.end(); } catch (e) { /* ignore */ }
  }
}

if (require.main === module) run();
module.exports = { run };
