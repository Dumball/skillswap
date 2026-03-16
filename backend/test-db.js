const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

console.log('Testing connection to:', process.env.DATABASE_URL);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect()
  .then(() => {
    console.log('Successfully connected to PostgreSQL');
    return client.query('SELECT current_database(), current_user, version();');
  })
  .then(res => {
    console.log('Info:', res.rows[0]);
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
