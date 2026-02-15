/**
 * issue-tokens.js
 * Usage (GUI): run this file with Code Runner or an npm script.
 * Node will read DATABASE_URL and BASE_URL from your .env.
 */

require('dotenv').config();
const crypto = require('crypto');
const QRCode = require('qrcode');
const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

function genToken(len = 12) {
  // generate a reasonably random base62-like token
  return crypto.randomBytes(Math.ceil(len * 3 / 4))
    .toString('base64')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, len);
}

async function ensureQrsDir() {
  const dir = path.join(__dirname, '..', '..', 'qrs');
  try {
    await fs.promises.mkdir(dir, { recursive: true });
    return dir;
  } catch (e) {
    // fallback sync attempt
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
}

async function run() {
  const eventId = parseInt(process.argv[2], 10) || 1;
  const qrsDir = await ensureQrsDir();
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to DB. Issuing tokens for eventId =', eventId);
    await client.query('BEGIN');

    const housesRes = await client.query('SELECT id FROM houses');
    const houses = housesRes.rows;
    console.log('Houses count:', houses.length);

    let issued = 0;
    for (const h of houses) {
      let success = false;
      for (let attempt = 0; attempt < 5 && !success; attempt++) {
        const token = genToken(12);
        try {
          const insertSql = `INSERT INTO tokens (token_code, event_id, house_id) VALUES ($1,$2,$3) RETURNING id, token_code`;
          const r = await client.query(insertSql, [token, eventId, h.id]);
          // generate QR file pointing to checkin URL
          const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
          const payload = `${base}/checkin?token=${token}`;
          const pngPath = path.join(qrsDir, `${token}.png`);
          await QRCode.toFile(pngPath, payload);
          issued++;
          success = true;
          // small log per 100 tokens to avoid huge output
          if (issued % 100 === 0) console.log(`Issued ${issued} tokens so far...`);
        } catch (err) {
          // unique violation or other DB error
          if (err && err.code === '23505') {
            // token collision, retry with new token
            console.warn('Collision when inserting token, retrying (attempt)', attempt + 1);
            continue;
          } else {
            throw err;
          }
        }
      }
      if (!success) throw new Error(`Failed to create token for house ${h.id} after retries`);
    }

    await client.query('COMMIT');
    console.log('Done. Total tokens issued:', issued, 'QRs saved to', qrsDir);
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch(e){ /* ignore */ }
    }
    console.error('Error in issue-tokens.js:', err && err.stack ? err.stack : err);
  } finally {
    if (client) client.release();
    // close pool only if script invoked directly
    try { await pool.end(); } catch(e){ /* ignore */ }
  }
}

if (require.main === module) {
  run();
}
module.exports = { run };
