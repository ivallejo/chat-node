const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT2,
    ssl: {
        rejectUnauthorized: false // Si necesitas conectarte a una base de datos sin validar el certificado
      }
});

module.exports = pool;
