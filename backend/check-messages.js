require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkMessagesTable() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'messages'");
        if (res.rows.length > 0) {
            console.log("Table 'messages' exists.");
            const columns = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages'");
            console.log("Columns:", columns.rows);
        } else {
            console.log("Table 'messages' does NOT exist.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
checkMessagesTable();
