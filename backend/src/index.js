require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const { pool } = require('./db');

const app = express(); // ✅ app FIRST

// --------------------
// Middleware
// --------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve QR images
app.use('/qrs', express.static(path.join(__dirname, '..', 'qrs')));

// --------------------
// Health check
// --------------------
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// --------------------
// Auth middleware (safe fallback for dev)
// --------------------
let requireAdmin = (req, res, next) => next();
try {
  const auth = require('./auth');
  if (auth?.requireAdmin) requireAdmin = auth.requireAdmin;
} catch (e) {
  console.warn('auth module missing or failed to load:', e.message);
}

// --------------------
// Routers
// --------------------
let adminAuthRouter = null;
let adminRouter = null;
let tokensRouter = null;
let eventsRouter = null;
let housesRouter = null;
let reportsRouter = null;

try { adminAuthRouter = require('./routes/adminAuth'); }
catch (e) { console.warn('adminAuth router missing:', e.message); }

try { adminRouter = require('./routes/admin'); }
catch (e) { console.warn('admin router missing:', e.message); }

try { tokensRouter = require('./routes/tokens'); }
catch (e) { console.warn('tokens router missing:', e.message); }

try { eventsRouter = require('./routes/events'); }
catch (e) { console.warn('events router missing:', e.message); }

try { housesRouter = require('./routes/houses'); }
catch (e) { console.warn('houses router missing:', e.message); }

try { reportsRouter = require('./routes/reports'); }
catch (e) { console.warn('reports router missing:', e.message); }

// --------------------
// Mount routers
// --------------------
if (adminAuthRouter) {
  app.use('/admin/auth', adminAuthRouter);
}

if (tokensRouter) {
  app.use('/tokens', tokensRouter);
}

if (adminRouter) {
  app.use('/admin', requireAdmin, adminRouter);
}

if (eventsRouter) {
  app.use('/admin/events', requireAdmin, eventsRouter);
}

if (housesRouter) {
  app.use('/admin/houses', requireAdmin, housesRouter);
}

if (reportsRouter) {
  app.use('/admin/reports', requireAdmin, reportsRouter);
}

// --------------------
// Start server
// --------------------
const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('DATABASE_URL =', process.env.DATABASE_URL || '(undefined)');
});

// --------------------
// Graceful shutdown
// --------------------
async function shutDownAndExit(signal) {
  console.log(`Shutting down (${signal})...`);
  try {
    server?.close();
    await pool.end();
  } catch (err) {
    console.warn('Shutdown error:', err);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutDownAndExit('SIGINT'));
process.on('SIGTERM', () => shutDownAndExit('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

module.exports = app;