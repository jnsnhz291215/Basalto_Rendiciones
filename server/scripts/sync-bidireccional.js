#!/usr/bin/env node
/**
 * CLI: sincronización bidireccional Turnos (basalto) ↔ Basalto_Rendiciones
 *
 *   cd server
 *   node scripts/sync-bidireccional.js
 *   node scripts/sync-bidireccional.js --dry-run
 *
 * Cron (ejemplo diario 3am):
 *   0 3 * * * cd /home/basalto/apps/Basalto_rendiciones/Basalto_Rendiciones/server && node scripts/sync-bidireccional.js >> /var/log/rendiciones-sync.log 2>&1
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { syncBidireccional } = require('../src/utils/syncBidireccional')

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`[sync] Inicio${dryRun ? ' (dry-run)' : ''}…`)
  const result = await syncBidireccional({ dryRun })
  console.log(JSON.stringify(result, null, 2))
  if (result.stats?.errores?.length) {
    console.error(`[sync] ${result.stats.errores.length} error(es)`)
    process.exitCode = 2
  } else {
    console.log('[sync] OK')
  }
  process.exit()
}

main().catch((err) => {
  console.error('[sync] FATAL', err)
  process.exit(1)
})
