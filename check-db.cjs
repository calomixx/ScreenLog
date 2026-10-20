const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query('SELECT id FROM users');
    console.log('Users:', res.rows);
    const media = await pool.query('SELECT id FROM media_items');
    console.log('Media:', media.rows);
  } catch (e) { console.error(e); }
  pool.end();
}
check();
