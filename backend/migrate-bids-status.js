require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function updateBidsSchema() {
    const client = await pool.connect();
    try {
        console.log('Adding status column to bids table...');
        await client.query(`
            ALTER TABLE bids 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
        `);
        console.log('Database updated successfully! 🎉');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

updateBidsSchema();
