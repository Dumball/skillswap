require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function createMessagesTable() {
    const client = await pool.connect();
    try {
        console.log('Creating messages table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES users(id),
                text TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Database updated successfully! 🎉');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

createMessagesTable();
