// backend/src/auth.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXP = process.env.JWT_EXP || '6h';

async function verifyAdminCredentials(username, password) {
  const r = await pool.query('SELECT id, username, password_hash, role FROM users WHERE username=$1 LIMIT 1', [username]);
  if (!r.rows.length) return null;
  const user = r.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return { id: user.id, username: user.username, role: user.role };
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXP });
}

async function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id) return res.status(401).json({ error: 'unauthorized' });

    const r = await pool.query('SELECT id, username, role FROM users WHERE id=$1 LIMIT 1', [decoded.id]);
    if (!r.rows.length) return res.status(401).json({ error: 'unauthorized' });
    const u = r.rows[0];
    if (u.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    req.admin = { id: u.id, username: u.username, role: u.role };
    next();
  } catch (e) {
    console.error('auth error', e && e.message);
    return res.status(401).json({ error: 'unauthorized' });
  }
}

module.exports = { verifyAdminCredentials, signToken, requireAdmin };
