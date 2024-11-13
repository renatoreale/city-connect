require('dotenv').config();
const mysql = require('mysql2/promise');


console.log('DB_HOST:', process.env.DB_HOST);

const pool = mysql.createPool({
    host: process.env.DB_HOST,      // L'host del database, deve puntare al database remoto
    user: process.env.DB_USER,      // Il nome utente del database
    password: process.env.DB_PASSWORD, // La password del database
    database: process.env.DB_NAME,  // Il nome del database
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;