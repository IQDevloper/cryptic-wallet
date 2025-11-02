#!/usr/bin/env tsx

/**
 * 🪙 Interactive Coin Addition Tool
 *
 * Simple wizard to add a new coin to your payment gateway
 *
 * Usage: npm run add-coin
 */

import { PrismaClient, NetworkType, AssetType, WalletStatus } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as readline from 'readline'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve))
}

// BIP44 coin types registry
const COIN_TYPES: Record<string, number> = {
  'BTC': 0,
  'LTC': 2,
  'DOGE': 3,
  'DASH': 5,
  'ETH': 60,
  'ETC': 61,
  'XRP': 144,
  'BCH': 145,
  'TRX': 195,
  'SOL': 501,
}

console.log('🪙 Interactive Coin Addition Tool\n')
console.log('This wizard will help you add a new coin to your payment gateway.\n')

async function main() {
  // Step 1: Coin basics
  console.log('📝 Step 1: Basic Information')
  console.log('─'.repeat(50))

  const symbol = (await question('Coin symbol (e.g., SOL, DOGE, XRP): ')).toUpperCase().trim()
  const name = await question(`Coin name (e.g., Solana, Dogecoin): `)
  const networkCode = (await question('Network code (lowercase, e.g., solana, dogecoin): ')).toLowerCase().trim()

  console.log('\n📊 Step 2: Network Type')
  console.log('─'.repeat(50))
  console.log('1. EVM (Ethereum-compatible: ETH, BSC, Polygon, Arbitrum)')
  console.log('2. UTXO (Bitcoin-like: BTC, LTC, DOGE)')
  console.log('3. TRON')
  console.log('4. SOLANA')

  const typeChoice = await question('\nSelect network type (1-4): ')

  const networkTypeMap: Record<string, NetworkType> = {
    '1': NetworkType.EVM,
    '2': NetworkType.UTXO,
    '3': NetworkType.TRON,
    '4': NetworkType.SOLANA
  }

  const networkType = networkTypeMap[typeChoice]

  if (!networkType) {
    console.log('❌ Invalid choice!')
    process.exit(1)
  }

  // Step 3: Technical details
  console.log('\n⚙️  Step 3: Technical Details')
  console.log('─'.repeat(50))

  const decimals = parseInt(await question(`Decimals (e.g., 18 for ETH, 8 for BTC): `))
  const explorerUrl = await question('Explorer URL (e.g., https://etherscan.io): ')
  const confirmations = parseInt(await question('Block confirmations needed (e.g., 12 for ETH, 6 for BTC): '))

  // Auto-generate derivation path
  const coinType = COIN_TYPES[symbol] || 0
  const derivationPath = `m/44'/${coinType}'/0'/0`

  console.log(`\n✅ Generated derivation path: ${derivationPath}`)

  // Step 4: Tatum integration
  console.log('\n🔗 Step 4: Tatum Integration')
  console.log('─'.repeat(50))

  const tatumChainId = await question(`Tatum chain ID (e.g., ethereum-mainnet, solana-mainnet): `)
  const kmsChainCode = (await question(`KMS chain code (e.g., ${symbol}): `)).toUpperCase() || symbol

  // Step 5: Summary
  console.log('\n📋 Summary')
  console.log('═'.repeat(50))
  console.log(`Coin Symbol:      ${symbol}`)
  console.log(`Coin Name:        ${name}`)
  console.log(`Network Code:     ${networkCode}`)
  console.log(`Network Type:     ${networkType}`)
  console.log(`Decimals:         ${decimals}`)
  console.log(`Derivation Path:  ${derivationPath}`)
  console.log(`Confirmations:    ${confirmations}`)
  console.log(`Explorer:         ${explorerUrl}`)
  console.log(`Tatum Chain ID:   ${tatumChainId}`)
  console.log(`KMS Chain Code:   ${kmsChainCode}`)
  console.log('═'.repeat(50))

  const confirm = await question('\nProceed with adding this coin? (yes/no): ')

  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled')
    process.exit(0)
  }

  // Step 6: Create in database
  console.log('\n💾 Creating in database...')

  try {
    // Create network
    const network = await prisma.network.create({
      data: {
        code: networkCode,
        name: name,
        type: networkType,
        tatumChainId: tatumChainId,
        explorerUrl: explorerUrl,
        blockConfirmations: confirmations,
        isActive: true
      }
    })

    console.log(`✅ Network created: ${network.id}`)

    // Create asset
    const asset = await prisma.asset.create({
      data: {
        symbol: symbol,
        name: name,
        type: AssetType.NATIVE, // Assume native, can be changed later
        isActive: true
      }
    })

    console.log(`✅ Asset created: ${asset.id}`)

    // Create asset network
    const assetNetwork = await prisma.assetNetwork.create({
      data: {
        assetId: asset.id,
        networkId: network.id,
        decimals: decimals,
        isActive: true
      }
    })

    console.log(`✅ AssetNetwork created: ${assetNetwork.id}`)

    // Step 7: Generate KMS wallet
    console.log('\n🔐 Generating KMS wallet...')

    const generateWallet = await question('Generate KMS wallet now? (yes/no): ')

    if (generateWallet.toLowerCase() === 'yes') {
      try {
        const password = process.env.TATUM_KMS_PASSWORD || await question('Enter KMS password: ')
        const command = `echo "${password}" | docker exec -i cryptic-kms node /opt/app/dist/index.js generatemanagedwallet ${kmsChainCode}`

        console.log(`Generating ${kmsChainCode} wallet...`)
        const { stdout } = await execAsync(command)

        // Parse output
        const lines = stdout.trim().split('\n')
        const jsonLines = lines.filter(line => {
          const trimmed = line.trim()
          return trimmed.startsWith('{') || trimmed.startsWith('}') || trimmed.startsWith('"') || trimmed.includes(':')
        })
        const jsonText = jsonLines.join('\n')
        const result = JSON.parse(jsonText)

        console.log(`✅ Wallet generated!`)
        console.log(`   Signature ID: ${result.signatureId}`)
        console.log(`   xPub: ${result.xpub?.substring(0, 30)}...`)

        // Create KMS wallet in database
        await prisma.kmsWallet.create({
          data: {
            networkId: network.id,
            signatureId: result.signatureId,
            xpub: result.xpub,
            derivationPath: derivationPath,
            purpose: 'BOTH',
            status: WalletStatus.ACTIVE,
            nextAddressIndex: 0
          }
        })

        console.log(`✅ KMS wallet stored in database`)

      } catch (error) {
        console.error('❌ KMS wallet generation failed:', error)
        console.log('⚠️  You can generate it manually later with:')
        console.log(`   echo "PASSWORD" | docker exec -i cryptic-kms node /opt/app/dist/index.js generatemanagedwallet ${kmsChainCode}`)
      }
    } else {
      console.log('⚠️  Skipped KMS wallet generation')
      console.log('   Generate manually when ready with:')
      console.log(`   echo "PASSWORD" | docker exec -i cryptic-kms node /opt/app/dist/index.js generatemanagedwallet ${kmsChainCode}`)
      console.log(`   Then run: npm run kms:extract-xpubs`)
    }

    // Success!
    console.log('\n🎉 SUCCESS!')
    console.log('═'.repeat(50))
    console.log(`${symbol} has been added to your payment gateway!`)
    console.log('\n📝 Next steps:')
    console.log(`1. Add ${symbol} logo to: /public/tokens/${symbol.toLowerCase()}.svg`)
    console.log(`2. Test invoice creation:`)
    console.log(`   curl -X POST http://localhost:3000/api/trpc/invoice.create \\`)
    console.log(`     -H "Authorization: Bearer YOUR_API_KEY" \\`)
    console.log(`     -d '{"amount":"10","currency":"${symbol}","network":"${networkCode}"}'`)
    console.log('\n✅ Done!')

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    rl.close()
  }
}

main()
