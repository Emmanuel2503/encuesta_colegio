const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// --- PRUEBA DE CONEXIÓN INMEDIATA ---
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ ERROR CRÍTICO: No se pudo conectar a PostgreSQL");
    console.error(
      "🔍 Revisa tu archivo .env y que la contraseña sea correcta."
    );
    console.error("Detalle del error:", err.code, err.message);
  } else {
    console.log("🔌 ¡Conectado a PostgreSQL exitosamente!");
    console.log(
      `   Base de datos: ${process.env.DB_NAME} en ${process.env.DB_HOST}`
    );
  }
});

module.exports = pool;
