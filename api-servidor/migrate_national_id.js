const pool = require('./db');

async function migrate() {
    try {
        await pool.query('ALTER TABLE surveys ADD COLUMN IF NOT EXISTS national_id VARCHAR(20)');
        console.log('Migration successful');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
