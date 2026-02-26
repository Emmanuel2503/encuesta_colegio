const pool = require('./db');
async function run() {
    const res = await pool.query('SELECT id, access_link, expiration_date, created_at, title FROM surveys ORDER BY created_at DESC LIMIT 20');
    console.log(res.rows);
    const schema = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'surveys';`);
    console.log(schema.rows);
    process.exit(0);
}
run();
