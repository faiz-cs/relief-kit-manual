require('dotenv').config();
const { Pool } = require('pg');

const isDocker = process.env.DOCKER === 'true';

const pool = new Pool({
  host: process.env.DB_HOST || (isDocker ? 'db' : 'localhost'),
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'reliefdb',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  console.log('PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('PostgreSQL error:', err);
});

module.exports = { pool };
