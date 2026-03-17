const { Pool } = require('pg');

console.log('[DB] DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err, client) => {
  console.error('[DB] Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection on startup
pool.query('SELECT 1')
  .then(() => {
    console.log('[DB] ✅ Database connection successful');
  })
  .catch(err => {
    console.error('[DB] ❌ Database connection failed:', err.message);
  });

module.exports = {
  query: (text, params) => {
    console.log('[DB] Query:', text.substring(0, 80) + '...');
    return pool.query(text, params);
  },
  getClient: () => pool.connect(),
};
