#!/usr/bin/env node
/**
 * Utilidades de password bcrypt (bcryptjs).
 *
 * Generar hash:
 *   node scripts/hash-password.js "miClave"
 *
 * Verificar hash:
 *   node scripts/hash-password.js --check "miClave" "$2a$10$...."
 *
 * Actualizar usuario en BD (requiere server/.env con DB_*):
 *   node scripts/hash-password.js --set-rut "21.191.911-6" "miClave"
 */
const bcrypt = require('bcryptjs')

async function main() {
  const args = process.argv.slice(2)
  if (!args.length || args[0] === '-h' || args[0] === '--help') {
    console.log(`Uso:
  node scripts/hash-password.js <password>
  node scripts/hash-password.js --check <password> <hash>
  node scripts/hash-password.js --set-rut <rut> <password>
`)
    process.exit(0)
  }

  if (args[0] === '--check') {
    const password = args[1]
    let hash = args[2] || ''
    if (hash.startsWith('$2y$')) hash = `$2a$${hash.slice(4)}`
    const ok = await bcrypt.compare(password, hash)
    console.log(ok ? 'OK: la clave coincide con el hash' : 'FAIL: no coincide')
    process.exit(ok ? 0 : 1)
  }

  if (args[0] === '--set-rut') {
    const rut = args[1]
    const password = args[2]
    if (!rut || !password) {
      console.error('Falta rut o password')
      process.exit(1)
    }
    const path = require('path')
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
    const { query } = require('../src/config/db')
    const hash = await bcrypt.hash(password, 10)
    const norm = String(rut)
      .trim()
      .toUpperCase()
      .replace(/\./g, '')
      .replace(/-/g, '')
      .replace(/\s+/g, '')
    const result = await query(
      `UPDATE usuarios
       SET password_hash = ?
       WHERE REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = ?
         AND is_deleted = FALSE`,
      [hash, norm]
    )
    if (!result.affectedRows) {
      console.error('No se actualizó ningún usuario (RUT no encontrado o is_deleted)')
      process.exit(1)
    }
    console.log(`OK: password actualizado (${result.affectedRows} fila(s))`)
    console.log(`Hash: ${hash}`)
    process.exit(0)
  }

  const password = args[0]
  const hash = await bcrypt.hash(password, 10)
  console.log(hash)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
