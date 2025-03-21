// In vitalis/server/db/index.js
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure connection pool with improved error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // reduce max clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // shorter timeout
  query_timeout: 10000, // query timeout in ms
});

// Log pool errors but don't crash
pool.on('error', (err, client) => {
  console.error('Unexpected PostgreSQL client error:', err);
  // Don't throw the error - just log it
});

// Export connection pool
module.exports = { pool };
