#!/usr/bin/env tsx

/**
 * Backup KMS Wallets - Export master mnemonics
 *
 * CRITICAL: This exports your MASTER MNEMONIC that can recover ALL funds!
 * Store this backup in a SECURE location (offline, encrypted).
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFileSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

async function exportKMSWallets() {
  console.log('🔐 Exporting KMS Wallets\n')
  console.log('⚠️  WARNING: This will export your MASTER MNEMONIC!')
  console.log('   Keep this information SECURE and OFFLINE!\n')

  try {
    const password = process.env.TATUM_KMS_PASSWORD || 'dskjfskjdf234324mmxzckljasdjasd^^^%%@'
    const command = `echo "${password}" | docker exec -i cryptic-kms node /opt/app/dist/index.js export`

    console.log('📤 Exporting from KMS...')
    const { stdout, stderr } = await execAsync(command)

    if (stderr && !stderr.includes('WARNING') && !stderr.includes('Secp256k1') && !stderr.includes('bigint')) {
      throw new Error(`KMS export failed: ${stderr}`)
    }

    // Parse JSON from output (skip warning lines)
    const lines = stdout.trim().split('\n')
    const jsonLines = lines.filter(line => {
      const trimmed = line.trim()
      return trimmed.startsWith('{') || trimmed.startsWith('}') || trimmed.startsWith('"') || trimmed.includes(':')
    })
    if (jsonLines.length === 0) {
      throw new Error('No JSON response from KMS')
    }
    const jsonText = jsonLines.join('\n')
    const wallets = JSON.parse(jsonText)

    // Save to file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFilename = `kms-backup-${timestamp}.json`
    const backupPath = join(process.cwd(), backupFilename)

    writeFileSync(backupPath, JSON.stringify(wallets, null, 2))

    console.log('✅ Wallets exported successfully!\n')
    console.log('📁 Backup saved to:', backupPath)
    console.log('\n📋 Wallet Summary:')
    console.log('━'.repeat(70))

    for (const [chain, data] of Object.entries(wallets)) {
      if (typeof data === 'object' && data !== null) {
        const walletData = data as any
        console.log(`\n🔑 ${chain.toUpperCase()}`)

        if (walletData.mnemonic) {
          console.log(`   Mnemonic: ${walletData.mnemonic.substring(0, 30)}...`)
        }

        if (walletData.xpub) {
          console.log(`   xPub: ${walletData.xpub.substring(0, 30)}...`)
        }

        if (walletData.address) {
          console.log(`   Address: ${walletData.address}`)
        }
      }
    }

    console.log('\n\n🔒 SECURITY RECOMMENDATIONS:')
    console.log('━'.repeat(70))
    console.log('1. ✅ Move this backup file to a secure, offline location')
    console.log('2. ✅ Consider storing on encrypted USB drive in safe')
    console.log('3. ✅ Never store in cloud storage unencrypted')
    console.log('4. ✅ Never commit to git repository')
    console.log('5. ✅ Create multiple backups in different secure locations')
    console.log('\n   Your master mnemonic can recover ALL funds!')
    console.log('   Anyone with access to it can steal your cryptocurrency!\n')

  } catch (error) {
    console.error('❌ Export failed:', error)
    process.exit(1)
  }
}

exportKMSWallets()
