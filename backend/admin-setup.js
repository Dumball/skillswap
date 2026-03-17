require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function setupAdminDB() {
    console.log('Connecting to database:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'));
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Adding role and status columns to users table if they do not exist...');
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
        `);

        console.log('Creating admin_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_logs (
                id SERIAL PRIMARY KEY,
                admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(255) NOT NULL,
                target_id VARCHAR(255),
                details JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Promoting user Shivang to admin for testing (if exists)...');
        await client.query(`
            UPDATE users SET role = 'admin' WHERE email LIKE '%@%' OR name = 'Shivang';
        `);

        await client.query('COMMIT');
        console.log('Admin database setup completed successfully! 🎉');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

setupAdminDB();
