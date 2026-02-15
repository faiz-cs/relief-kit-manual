// backend/src/routes/adminAuth.js
const express = require('express');
const router = express.Router();
const { verifyAdminCredentials, signToken } = require('../auth');

// Simple in-memory login attempt tracker (IP => { attempts, lastFailedAt, blockedUntil })
// MVP-only: replace with Redis or persistent store for production.
const attempts = new Map();
const MAX_ATTEMPTS = 6;
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function recordFailedAttempt(ip) {
  const now = Date.now();
  const info = attempts.get(ip) || { attempts: 0, lastFailedAt: 0, blockedUntil: 0 };
  info.attempts = (info.attempts || 0) + 1;
  info.lastFailedAt = now;
  if (info.attempts >= MAX_ATTEMPTS) {
    info.blockedUntil = now + BLOCK_DURATION_MS;
  }
  attempts.set(ip, info);
}

function resetAttempts(ip) {
  attempts.delete(ip);
}

function isBlocked(ip) {
  const info = attempts.get(ip);
  if (!info) return false;
  if (info.blockedUntil && Date.now() < info.blockedUntil) return true;
  // unblock if block duration expired
  if (info.blockedUntil && Date.now() >= info.blockedUntil) {
    attempts.delete(ip);
    return false;
  }
  return false;
}

/**
 * POST /admin/auth/login
 * Body: { username, password }
 * Response: { token, expiresIn, user: { id, username } }
 */
router.post('/login', async (req, res) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    // Basic content-type check (helps avoid accidental form posts)
    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'expected_json' });
    }

    // Rate-limit / block check
    if (isBlocked(ip)) {
      return res.status(429).json({ error: 'too_many_attempts', message: 'Too many failed attempts. Try again later.' });
    }

    let { username, password } = req.body || {};
    if (!username || !password) {
      // record failed attempt for missing credentials (discourage brute force)
      recordFailedAttempt(ip);
      return res.status(400).json({ error: 'username_password_required' });
    }

    // normalize username (trim + lowercase) to avoid accidental mismatches
    username = String(username).trim().toLowerCase();

    const user = await verifyAdminCredentials(username, password);
    if (!user) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    // successful login -> reset attempt counter
    resetAttempts(ip);

    const token = signToken({ id: user.id, username: user.username });
    // optional: if you want to return expiry info, derive from process.env.JWT_EXP if present
    const expiresIn = process.env.JWT_EXP || '6h';

    return res.json({
      token,
      expiresIn,
      user: { id: user.id, username: user.username }
    });

  } catch (e) {
    console.error('admin login error', e && e.stack ? e.stack : e);
    return res.status(500).json({ error: 'server_error' });
  }
});
router.post('/tokens/:token_code/manual-checkin', async (req, res) => {
  const tokenCode = req.params.token_code;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const upd = await client.query(
      `UPDATE tokens
         SET used = true, used_at = now(), status = 'used'
       WHERE token_code = $1 AND used = false
       RETURNING id, house_id, event_id, token_code`,
      [tokenCode]
    );
    if (!upd.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_or_already_used' });
    }
    const token = upd.rows[0];
    await client.query(
      `INSERT INTO token_audit (token_id, action, performed_by, details)
       VALUES ($1, 'checked_in', $2, $3)`,
      [token.id, req.admin?.id || null, JSON.stringify({ ip: req.ip, by: req.admin?.username || null })]
    );
    await client.query('COMMIT');
    return res.json({ success: true, token });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('manual-checkin error', e);
    return res.status(500).json({ error: 'server_error', detail: e.message });
  } finally {
    client.release();
  }
});


module.exports = router;
