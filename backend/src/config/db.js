const { Pool } = require('pg');

console.log('[DB] DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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

// Initialize database tables
const initDatabase = async () => {
  try {
    console.log('[DB] 🔄 Initializing database tables...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        reputation_score DECIMAL(3, 2) DEFAULT 0.0,
        skill_credits INTEGER DEFAULT 100,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] ✅ users table created/verified');

    // Create skills table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        skill_name VARCHAR(255) NOT NULL,
        skill_category VARCHAR(100) NOT NULL,
        skill_level VARCHAR(50) NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        verification_score INTEGER,
        portfolio_link VARCHAR(255),
        last_verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] ✅ skills table created/verified');

    // Create auctions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auctions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        skill_required VARCHAR(255) NOT NULL,
        skill_category VARCHAR(100) NOT NULL,
        creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        minimum_credit_value INTEGER NOT NULL,
        auction_start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        auction_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] ✅ auctions table created/verified');

    // Create bids table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
        bidder_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        skill_offered VARCHAR(255) NOT NULL,
        credit_value INTEGER NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] ✅ bids table created/verified');

    console.log('[DB] ✅ All tables initialized successfully');
    return true;
  } catch (err) {
    console.error('[DB] ❌ Error initializing database:', err.message);
    return false;
  }
};

module.exports = {
  query: (text, params) => {
    console.log('[DB] Query:', text.substring(0, 80) + '...');
    return pool.query(text, params);
  },
  getClient: () => pool.connect(),
  initDatabase
};
