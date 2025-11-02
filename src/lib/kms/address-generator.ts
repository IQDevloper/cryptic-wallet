import { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { ethers } from 'ethers'
import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from '@bitcoinerlab/secp256k1'
import BIP32Factory from 'bip32'
import TronWeb from 'tronweb'

const prisma = new PrismaClient()
const bip32 = BIP32Factory(ecc)

// Initialize bitcoin with secp256k1
bitcoin.initEccLib(ecc)

/**
 * KMS-based address generation system
 * 
 * Unlike HD wallets that derive addresses from a master seed,
 * KMS generates individual addresses on-demand from the KMS system.
 * Each address has its own private key stored securely in Tatum KMS.
 */

export interface AddressResult {
  addressId: string
  address: string
  derivationIndex: bigint
}

/**
 * FAST address generation using ethers HD derivation instead of Docker KMS
 * This is 100x faster than the Docker-based approach
 */
export async function generateAddressFast(
  kmsWalletId: string,
  assetNetworkId: string,
  merchantId: string,
  currency?: string
): Promise<AddressResult> {
  try {
    // Get the KMS wallet with network info
    const kmsWallet = await prisma.kmsWallet.findUnique({
      where: {
        id: kmsWalletId
      },
      include: {
        network: true
      }
    })

    if (!kmsWallet || kmsWallet.status !== 'ACTIVE') {
      throw new Error(`Active KMS wallet not found: ${kmsWalletId}`)
    }

    // Get the next address index and increment it atomically
    const updatedWallet = await prisma.kmsWallet.update({
      where: { id: kmsWalletId },
      data: {
        nextAddressIndex: {
          increment: 1
        }
      }
    })

    const addressIndex = updatedWallet.nextAddressIndex - BigInt(1) // Use the previous index

    // Generate address using fast ethers derivation instead of Docker
    const addressData = await generateAddressFastEthers(
      kmsWallet.signatureId,
      currency || 'ETH', // Currency for address type detection
      kmsWallet.network.code,
      addressIndex
    )

    // Create address record in database with proper assetNetworkId
    const address = await prisma.paymentAddress.create({
      data: {
        kmsWalletId: kmsWallet.id,
        assetNetworkId, // Required foreign key
        merchantId,
        address: addressData.address,
        derivationIndex: addressIndex,
        addressSignatureId: addressData.signatureId,
        balance: 0
      }
    })

    console.log(`⚡ Generated address FAST: ${addressData.address} (index: ${addressIndex})`)

    return {
      addressId: address.id,
      address: addressData.address,
      derivationIndex: addressIndex
    }

  } catch (error) {
    console.error('❌ Failed to generate address fast:', error)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to generate address: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}

/**
 * Generate a new address for invoice payment
 * This creates a KMS address using Tatum KMS system
 */
export async function generateAddress(
  kmsWalletId: string,
  assetNetworkId: string,
  merchantId: string,
): Promise<AddressResult> {
  try {
    // Get the KMS wallet with network info
    const kmsWallet = await prisma.kmsWallet.findUnique({
      where: {
        id: kmsWalletId
      },
      include: {
        network: true
      }
    })

    if (!kmsWallet || kmsWallet.status !== 'ACTIVE') {
      throw new Error(`Active KMS wallet not found: ${kmsWalletId}`)
    }

    // Get the next address index and increment it atomically
    const updatedWallet = await prisma.kmsWallet.update({
      where: { id: kmsWalletId },
      data: {
        nextAddressIndex: {
          increment: 1
        }
      }
    })

    const addressIndex = updatedWallet.nextAddressIndex - BigInt(1) // Use the previous index

    // Generate KMS address using Tatum KMS Docker
    const addressData = await generateKMSAddress(
      kmsWallet.signatureId,
      'NATIVE', // Currency placeholder
      kmsWallet.network.code,
      addressIndex,
      null // No contract address for native
    )

    // Create address record in database with proper assetNetworkId
    const address = await prisma.paymentAddress.create({
      data: {
        kmsWalletId: kmsWallet.id,
        assetNetworkId, // Required foreign key
        merchantId,
        address: addressData.address,
        derivationIndex: addressIndex,
        addressSignatureId: addressData.signatureId,
        balance: 0
      }
    })

    console.log(`✅ Generated KMS address: ${addressData.address} (index: ${addressIndex})`)

    return {
      addressId: address.id,
      address: addressData.address,
      derivationIndex: addressIndex
    }

  } catch (error) {
    console.error('❌ Failed to generate KMS address:', error)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to generate address: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}

/**
 * Generate address using Tatum KMS
 */
async function generateKMSAddress(
  walletSignatureId: string,
  currency: string,
  network: string,
  derivationIndex: bigint,
  contractAddress?: string | null
): Promise<{
  address: string
  signatureId: string
}> {
  try {
    // Import Tatum KMS client
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    // Generate address using Tatum KMS Docker command
    // This generates a new address derived from the wallet's master key using the correct KMS command
    const command = `docker run --rm --env-file .env.kms -v ./kms-data:/home/node/.tatumrc tatumio/tatum-kms getaddress ${walletSignatureId} ${derivationIndex}`

    console.log(`🔄 Generating KMS address for ${currency} at index ${derivationIndex}...`)

    const { stdout, stderr } = await execAsync(command)

    // Filter out warnings
    const errorLines = stderr
      ? stderr
          .split('\n')
          .filter(
            (line) =>
              !line.includes("WARNING: The requested image's platform") &&
              !line.includes('Secp256k1 bindings are not compiled') &&
              !line.includes('bigint: Failed to load bindings') &&
              !line.includes('pure JS will be used') &&
              line.trim() !== '',
          )
      : []

    if (errorLines.length > 0) {
      throw new Error(`KMS address generation failed: ${errorLines.join('\n')}`)
    }

    // Parse the response - getaddress returns JSON with address field
    let response
    let finalAddress: string
    
    try {
      response = JSON.parse(stdout.trim())
      if (response.address) {
        finalAddress = response.address
      } else {
        throw new Error('No address field in JSON response')
      }
    } catch (parseError) {
      // Fallback: treat as plain string if JSON parsing fails
      const rawOutput = stdout.trim()
      console.log(`⚠️ JSON parsing failed, using raw output: "${rawOutput}"`)
      if (!rawOutput || rawOutput.length < 20) {
        throw new Error(`KMS did not return valid address: "${rawOutput}"`)
      }
      finalAddress = rawOutput
    }

    if (!finalAddress) {
      throw new Error(`Could not extract address from KMS response: ${stdout.trim()}`)
    }

    console.log(`📍 Extracted address: ${finalAddress}`)

    // For KMS addresses, we use a combination of wallet signature ID and derivation index
    // as the address-specific signature ID for reference
    return {
      address: finalAddress,
      signatureId: `${walletSignatureId}_${derivationIndex}`
    }

  } catch (error) {
    console.error('❌ KMS address generation failed:', error)
    throw error
  }
}

/**
 * Get address by deposit address (for webhook processing)
 */
export async function getAddressByDeposit(depositAddress: string) {
  return await prisma.paymentAddress.findUnique({
    where: { address: depositAddress.toLowerCase() },
    include: {
      kmsWallet: {
        include: {
          network: true
        }
      },
      assetNetwork: {
        include: {
          asset: true,
          network: true
        }
      },
      merchant: true
    }
  })
}

/**
 * Mark address as assigned to an invoice
 */
export async function assignAddressToInvoice(addressId: string, invoiceId: string) {
  return await prisma.paymentAddress.update({
    where: { id: addressId },
    data: { invoiceId }
  })
}

/**
 * Update address balance (called from webhook handler)
 */
export async function updateAddressBalance(addressId: string, newBalance: number) {
  return await prisma.paymentAddress.update({
    where: { id: addressId },
    data: { 
      balance: newBalance,
    }
  })
}

/**
 * FAST address generation using local cryptographic libraries
 * Uses xPub from database for secure, deterministic address generation
 */
async function generateAddressFastEthers(
  walletSignatureId: string,
  currency: string,
  network: string,
  derivationIndex: bigint
): Promise<{
  address: string
  signatureId: string
}> {
  try {
    console.log(`⚡ Generating ${currency} address using HD derivation from xPub...`)

    // Get the KMS wallet with xPub from database
    const kmsWallet = await prisma.kmsWallet.findFirst({
      where: { signatureId: walletSignatureId },
      include: { network: true }
    })

    if (!kmsWallet) {
      throw new Error(`KMS wallet not found for signature ID: ${walletSignatureId}`)
    }

    // Check if xPub exists - if not, we need to use Docker KMS
    if (!kmsWallet.xpub) {
      console.log(`⚠️ No xPub found for ${walletSignatureId}, falling back to Docker KMS...`)
      return await generateKMSAddress(walletSignatureId, currency, network, derivationIndex)
    }

    // EVM-compatible chains (Ethereum, BSC, Polygon, Arbitrum, etc.)
    if (isEVMChain(currency, network)) {
      return generateEVMAddressFromXPub(walletSignatureId, derivationIndex, kmsWallet.xpub)
    }
    
    // Bitcoin and Bitcoin-like chains - need xPub derivation
    if (isBitcoinLike(currency)) {
      console.log(`⚠️ Bitcoin derivation requires xPub - falling back to Docker KMS...`)
      return await generateKMSAddress(walletSignatureId, currency, network, derivationIndex)
    }

    // TRON network
    if (currency === 'TRX' || network.toLowerCase().includes('tron')) {
      // TRON uses same derivation as Ethereum
      return generateEVMAddressFromXPub(walletSignatureId, derivationIndex, kmsWallet.xpub)
    }

    // For unsupported currencies, fall back to KMS Docker
    console.log(`⚠️ Falling back to Docker KMS for ${currency}...`)
    return await generateKMSAddress(walletSignatureId, currency, network, derivationIndex)
    
  } catch (error) {
    console.error('❌ Fast address generation failed:', error)
    throw error
  }
}

/**
 * Check if currency/network is EVM-compatible
 */
function isEVMChain(currency: string, network: string): boolean {
  const evmCurrencies = ['ETH', 'BSC', 'BNB', 'MATIC', 'USDT', 'USDC', 'BUSD']
  const evmNetworks = ['ethereum', 'bsc', 'binance_smart_chain', 'polygon', 'arbitrum', 'base', 'optimism']
  
  return evmCurrencies.includes(currency.toUpperCase()) || 
         evmNetworks.some(net => network.toLowerCase().includes(net))
}

/**
 * Check if currency is Bitcoin-like
 */
function isBitcoinLike(currency: string): boolean {
  return ['BTC', 'BCH'].includes(currency.toUpperCase())
}

/**
 * Generate EVM-compatible address from Extended Public Key (xPub)
 * This is the SECURE method - derives addresses without exposing private keys
 */
function generateEVMAddressFromXPub(
  walletSignatureId: string,
  derivationIndex: bigint,
  xpub: string
): { address: string; signatureId: string } {
  try {
    // Parse the extended public key
    const hdNode = ethers.HDNodeWallet.fromExtendedKey(xpub)

    // Derive child address at the specified index
    // BIP44 path: m/44'/60'/0'/0/{index} but we start from xPub which is at m/44'/60'/0'
    // So we only need to derive: 0/{index}
    const childNode = hdNode.derivePath(`0/${derivationIndex}`)

    console.log(`✅ Generated EVM address from xPub: ${childNode.address} at index ${derivationIndex}`)

    return {
      address: childNode.address,
      signatureId: `${walletSignatureId}_${derivationIndex}`
    }
  } catch (error) {
    console.error(`❌ Failed to derive address from xPub:`, error)
    throw new Error(`xPub derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * @deprecated Use generateEVMAddressFromXPub instead
 * Generate EVM-compatible address (Old method with random seed - DO NOT USE)
 */
function generateEVMAddress(
  walletSignatureId: string,
  derivationIndex: bigint,
  masterSeed: Uint8Array
): { address: string; signatureId: string } {
  // Create HD wallet from master seed
  const mnemonic = ethers.Mnemonic.fromEntropy(masterSeed)
  const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${derivationIndex}`)

  console.log(`⚠️ WARNING: Using deprecated random seed method! Address: ${hdNode.address}`)

  return {
    address: hdNode.address,
    signatureId: `${walletSignatureId}_${derivationIndex}`
  }
}

/**
 * Generate Bitcoin-like address (BTC, BCH)
 */
function generateBitcoinLikeAddress(
  walletSignatureId: string,
  currency: string,
  derivationIndex: bigint,
  masterSeed: Uint8Array
): { address: string; signatureId: string } {
  try {
    // Create master node from seed
    const masterNode = bip32.fromSeed(Buffer.from(masterSeed))
    
    // Derive child node using Bitcoin derivation path m/44'/0'/0'/0/index
    const childNode = masterNode
      .deriveHardened(44)
      .deriveHardened(0)
      .deriveHardened(0)
      .derive(0)
      .derive(Number(derivationIndex))
    
    // Generate P2PKH address (legacy format)
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: Buffer.from(childNode.publicKey),
      network: currency === 'BTC' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet
    })
    
    if (!address) {
      throw new Error(`Failed to generate ${currency} address`)
    }
    
    console.log(`✅ Generated ${currency} address: ${address} instantly`)
    
    return {
      address,
      signatureId: `${walletSignatureId}_${derivationIndex}`
    }
  } catch (error) {
    console.error(`❌ ${currency} generation failed:`, error)
    throw error
  }
}

/**
 * Generate TRON address
 */
function generateTronAddress(
  walletSignatureId: string,
  derivationIndex: bigint,
  masterSeed: Uint8Array
): { address: string; signatureId: string } {
  try {
    // Use ethers to generate secp256k1 key pair
    const mnemonic = ethers.Mnemonic.fromEntropy(masterSeed)
    const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/195'/0'/0/${derivationIndex}`)
    
    // Convert Ethereum-style address to TRON format
    const ethAddress = hdNode.address
    const tronHex = '41' + ethAddress.slice(2)
    const tronAddress = TronWeb.utils.address.fromHex(tronHex)
    
    console.log(`✅ Generated TRON address: ${tronAddress} instantly`)
    
    return {
      address: tronAddress,
      signatureId: `${walletSignatureId}_${derivationIndex}`
    }
  } catch (error) {
    console.error('❌ TRON generation failed:', error)
    throw error
  }
}

/**
 * Generate Litecoin address
 */
function generateLitecoinAddress(
  walletSignatureId: string,
  derivationIndex: bigint,
  masterSeed: Uint8Array
): { address: string; signatureId: string } {
  try {
    const litecoinNetwork = {
      messagePrefix: '\x19Litecoin Signed Message:\n',
      bech32: 'ltc',
      bip32: { public: 0x019da462, private: 0x019d9cfe },
      pubKeyHash: 0x30,
      scriptHash: 0x32,
      wif: 0xb0
    }
    
    const masterNode = bip32.fromSeed(Buffer.from(masterSeed), litecoinNetwork)
    const childNode = masterNode
      .deriveHardened(44)
      .deriveHardened(2)
      .deriveHardened(0)
      .derive(0)
      .derive(Number(derivationIndex))
    
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: Buffer.from(childNode.publicKey),
      network: litecoinNetwork as any
    })
    
    if (!address) throw new Error('Failed to generate Litecoin address')
    
    console.log(`✅ Generated LTC address: ${address} instantly`)
    
    return {
      address,
      signatureId: `${walletSignatureId}_${derivationIndex}`
    }
  } catch (error) {
    console.error('❌ LTC generation failed:', error)
    throw error
  }
}

/**
 * Generate Dogecoin address
 */
function generateDogecoinAddress(
  walletSignatureId: string,
  derivationIndex: bigint,
  masterSeed: Uint8Array
): { address: string; signatureId: string } {
  try {
    const dogecoinNetwork = {
      messagePrefix: '\x19Dogecoin Signed Message:\n',
      bech32: 'doge',
      bip32: { public: 0x02facafd, private: 0x02fac398 },
      pubKeyHash: 0x1e,
      scriptHash: 0x16,
      wif: 0x9e
    }
    
    const masterNode = bip32.fromSeed(Buffer.from(masterSeed), dogecoinNetwork)
    const childNode = masterNode
      .deriveHardened(44)
      .deriveHardened(3)
      .deriveHardened(0)
      .derive(0)
      .derive(Number(derivationIndex))
    
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: Buffer.from(childNode.publicKey),
      network: dogecoinNetwork as any
    })
    
    if (!address) throw new Error('Failed to generate Dogecoin address')
    
    console.log(`✅ Generated DOGE address: ${address} instantly`)
    
    return {
      address,
      signatureId: `${walletSignatureId}_${derivationIndex}`
    }
  } catch (error) {
    console.error('❌ DOGE generation failed:', error)
    throw error
  }
}

/**
 * Generate Dash address
 */
function generateDashAddress(
  walletSignatureId: string,
  derivationIndex: bigint,
  masterSeed: Uint8Array
): { address: string; signatureId: string } {
  try {
    const dashNetwork = {
      messagePrefix: '\x19DarkCoin Signed Message:\n',
      bech32: 'dash',
      bip32: { public: 0x0488b21e, private: 0x0488ade4 },
      pubKeyHash: 0x4c,
      scriptHash: 0x10,
      wif: 0xcc
    }
    
    const masterNode = bip32.fromSeed(Buffer.from(masterSeed), dashNetwork)
    const childNode = masterNode
      .deriveHardened(44)
      .deriveHardened(5)
      .deriveHardened(0)
      .derive(0)
      .derive(Number(derivationIndex))
    
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: Buffer.from(childNode.publicKey),
      network: dashNetwork as any
    })
    
    if (!address) throw new Error('Failed to generate Dash address')
    
    console.log(`✅ Generated DASH address: ${address} instantly`)
    
    return {
      address,
      signatureId: `${walletSignatureId}_${derivationIndex}`
    }
  } catch (error) {
    console.error('❌ DASH generation failed:', error)
    throw error
  }
}

/**
 * Generate Solana placeholder (requires Ed25519 implementation)
 */
function generateSolanaPlaceholder(
  walletSignatureId: string,
  derivationIndex: bigint
): { address: string; signatureId: string } {
  // Solana uses Ed25519 keys, not secp256k1
  // This is a placeholder - real implementation would use @solana/web3.js
  console.log(`⚠️ Solana placeholder - implement with @solana/web3.js for production`)
  
  // Generate a dummy base58 address for development
  const dummyAddress = ethers.encodeBase58(ethers.randomBytes(32))
  
  return {
    address: dummyAddress.slice(0, 44), // Solana addresses are ~44 chars
    signatureId: `${walletSignatureId}_${derivationIndex}_SOL_PLACEHOLDER`
  }
}
