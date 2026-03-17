require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'transactions'");
        console.log('Transactions columns:', res.rows);
        
        const bidRes = await pool.query("SELECT * FROM bids LIMIT 1");
        console.log('Bids sample row:', bidRes.rows[0]);

        const txRes = await pool.query("SELECT * FROM transactions LIMIT 1");
        console.log('Transactions sample row:', txRes.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
checkSchema();
