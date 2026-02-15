// backend/create_admin.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('./src/db');

async function run() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'Admin@123';
  const name = process.argv[4] || 'Administrator';
  const hash = await bcrypt.hash(password, 10);
  const r = await pool.query(
    `INSERT INTO adminusers (username, name, password_hash, role) 
     VALUES ($1,$2,$3,'admin') ON CONFLICT (username) DO NOTHING RETURNING id`,
    [username, name, hash]
  );
  console.log('created:', r.rows);
  await pool.end();
  console.log('done');
}

if (require.main === module) run();
module.exports = { run };
