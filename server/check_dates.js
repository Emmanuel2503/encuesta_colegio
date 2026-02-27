const pool = require('./db');
async function run() {
  const res = await pool.query('SELECT id, access_link, expiration_date, created_at, title FROM surveys ORDER BY created_at DESC LIMIT 5');
  console.log(res.rows);
  process.exit(0);
}
run();
