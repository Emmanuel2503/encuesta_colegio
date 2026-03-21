const { Pool } = require("pg");
require("dotenv").config();

// Configuración Híbrida: Detecta si estamos en Render (Nube) o en tu PC (Local)
const poolConfig = process.env.DATABASE_URL
  ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Obligatorio para conectarse a Supabase desde Render
  }
  : {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
  };

const pool = new Pool(poolConfig);

// --- PRUEBA DE CONEXIÓN INMEDIATA ---
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ ERROR CRÍTICO: No se pudo conectar a PostgreSQL");
    console.error("Detalle del error:", err.message);
  } else {
    console.log("🔌 ¡Conectado a PostgreSQL exitosamente!");
  }
});

module.exports = pool;