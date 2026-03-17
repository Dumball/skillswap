require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function updateTransactionsSchema() {
    const client = await pool.connect();
    try {
        console.log('Updating transactions table schema...');
        
        // Add credit_value if not exists
        await client.query(`
            ALTER TABLE transactions 
            ADD COLUMN IF NOT EXISTS credit_value INTEGER;
        `);

        // Check columns to decide if we need to rename or just use agreed_skill
        // The previous check showed agreed_skill exists.
        
        console.log('Database updated successfully! 🎉');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

updateTransactionsSchema();
