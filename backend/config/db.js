
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const ssl = process.env.DB_SSL === "true"
    ? {
        ca: fs.readFileSync(path.join(__dirname, "..", "ca.pem")),
        rejectUnauthorized: true
    }
    : undefined;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl
});

module.exports = pool;
