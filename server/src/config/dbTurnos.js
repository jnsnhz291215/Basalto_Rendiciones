const mysql = require('mysql2/promise')

/**
 * Pool hacia la BD de Turnos (`basalto`).
 * Env: TURNOS_DB_* o DB_TURNOS_* (fallback: mismos host/user/pass que Rendiciones, DB=basalto).
 */
const poolTurnos = mysql.createPool({
  host: process.env.TURNOS_DB_HOST || process.env.DB_TURNOS_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(
    process.env.TURNOS_DB_PORT || process.env.DB_TURNOS_PORT || process.env.DB_PORT || 3306
  ),
  user: process.env.TURNOS_DB_USER || process.env.DB_TURNOS_USER || process.env.DB_USER || 'root',
  password:
    process.env.TURNOS_DB_PASS ||
    process.env.TURNOS_DB_PASSWORD ||
    process.env.DB_TURNOS_PASS ||
    process.env.DB_TURNOS_PASSWORD ||
    process.env.DB_PASS ||
    process.env.DB_PASSWORD ||
    '',
  database:
    process.env.TURNOS_DB_NAME || process.env.DB_TURNOS_NAME || process.env.TURNOS_DB || 'basalto',
  waitForConnections: true,
  connectionLimit: 5,
  namedPlaceholders: false,
  timezone: 'Z'
})

async function queryTurnos(sql, params = []) {
  const [rows] = await poolTurnos.execute(sql, params)
  return rows
}

module.exports = { poolTurnos, queryTurnos }
