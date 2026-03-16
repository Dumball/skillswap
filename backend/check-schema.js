const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('Listing tables:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    for (const row of tables.rows) {
      console.log(`\nTable: ${row.table_name}`);
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [row.table_name]);
      console.table(columns.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSchema();
