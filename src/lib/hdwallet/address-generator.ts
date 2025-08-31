import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { ethers } from 'ethers'

const prisma = new PrismaClient()

// Bitcoin address validation and generation
function generateValidBitcoinTestnetAddress(seed: string): string {
  // Generate a deterministic hash
  const hash = crypto.createHash('sha256').update(seed).digest()
  
  // Create a valid Bitcoin testnet P2PKH address (starts with 'm' or 'n')
  // Using the hash to create the address payload
  const payload = hash.slice(0, 20) // 20 bytes for P2PKH
  
  // Add testnet P2PKH version byte (0x6f for 'n' addresses)
  const versionedPayload = Buffer.concat([Buffer.from([0x6f]), payload])
  
  // Calculate checksum (double SHA256)
  const checksum1 = crypto.createHash('sha256').update(versionedPayload).digest()
  const checksum2 = crypto.createHash('sha256').update(checksum1).digest()
  const checksum = checksum2.slice(0, 4)
  
  // Combine versioned payload + checksum
  const fullPayload = Buffer.concat([versionedPayload, checksum])
  
  // Base58 encode
  return base58Encode(fullPayload)
}

// Simple Base58 encoding (Bitcoin alphabet)
function base58Encode(buffer: Buffer): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  
  // Convert buffer to big integer
  let num = BigInt('0x' + buffer.toString('hex'))
  let result = ''
  
  // Convert to base58
  while (num > 0) {
    const remainder = num % 58n
    result = alphabet[Number(remainder)] + result
    num = num / 58n
  }
  
  // Add leading '1's for leading zeros
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    result = '1' + result
  }
  
  return result
}

export async function generateAddress(globalWalletId: string, merchantId: string) {
  // Get the global wallet
  const globalWallet = await prisma.globalHDWallet.findUnique({
    where: { id: globalWalletId }
  })

  if (!globalWallet) {
    throw new Error('Global wallet not found')
  }

  // Get the next address index and increment it
  const currentIndex = globalWallet.nextAddressIndex
  const nextIndex = currentIndex + BigInt(1)

  // Update the global wallet with the new index
  await prisma.globalHDWallet.update({
    where: { id: globalWalletId },
    data: { nextAddressIndex: nextIndex }
  })

  // Generate a unique address based on the derivation path and index
  // For MVP, we'll generate a mock address. In production, use proper HD wallet derivation
  const address = generateMockAddress(globalWallet.currency, globalWallet.network, Number(currentIndex))

  // Store the derived address for tracking
  const derivedAddress = await prisma.derivedAddress.create({
    data: {
      globalWalletId,
      merchantId,
      address,
      derivationIndex: currentIndex, // BigInt value
    }
  })

  return {
    address,
    index: Number(currentIndex),
    derivationIndex: currentIndex,
    derivedAddressId: derivedAddress.id
  }
}

function generateMockAddress(currency: string, network: string, index: number): string {
  // Generate deterministic mock addresses for MVP
  // In production, use proper HD wallet derivation with the actual xpub
  
  const seed = `${currency}-${network}-${index}-${process.env.JWT_SECRET || 'secret'}`
  const hash = crypto.createHash('sha256').update(seed).digest('hex')
  
  // Handle both mainnet and testnet networks
  const networkLower = network.toLowerCase()
  
  // Check if it's an Ethereum-like network (including testnets)
  if (networkLower.includes('ethereum') || 
      networkLower.includes('sepolia') ||
      networkLower.includes('bsc') || 
      networkLower.includes('polygon') ||
      networkLower.includes('arbitrum') ||
      networkLower.includes('base') ||
      networkLower.includes('amoy')) {
    
    // Generate a valid Ethereum address with proper checksum
    // Use the hash to create a private key, then derive the address
    const privateKey = `0x${hash.slice(0, 64)}`
    const wallet = new ethers.Wallet(privateKey)
    return wallet.address // This returns a checksummed address
  }
  
  // Bitcoin and Bitcoin testnet
  if (networkLower.includes('bitcoin')) {
    if (networkLower.includes('testnet')) {
      // Generate proper Bitcoin testnet address with checksum
      return generateValidBitcoinTestnetAddress(seed)
    }
    return `1${hash.slice(0, 32)}` // Bitcoin mainnet legacy address format (placeholder)
  }
  
  // TRON networks (both mainnet and testnet use 'T' prefix)
  if (networkLower.includes('tron') || networkLower.includes('shasta')) {
    return `T${hash.slice(0, 33)}` // TRON address format (same for mainnet and testnet)
  }
  
  // Solana networks
  if (networkLower.includes('solana') || networkLower.includes('devnet')) {
    // Solana addresses are base58 encoded, typically 44 characters
    // Generate a valid-looking Solana address
    const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < 44; i++) {
      result += base58chars[parseInt(hash.slice(i % 32, (i % 32) + 1), 16) % base58chars.length]
    }
    return result
  }
  
  // Sui networks
  if (networkLower.includes('sui')) {
    // Sui addresses start with '0x' and are 32 bytes (64 hex chars) long
    return `0x${hash.slice(0, 64)}`
  }
  
  // Litecoin
  if (networkLower.includes('litecoin')) {
    return `L${hash.slice(0, 33)}` // Litecoin legacy address format
  }
  
  // Dogecoin
  if (networkLower.includes('dogecoin')) {
    return `D${hash.slice(0, 33)}` // Dogecoin address format
  }
  
  // Dash
  if (networkLower.includes('dash')) {
    return `X${hash.slice(0, 33)}` // Dash address format
  }
  
  // Default fallback
  return `addr_${hash.slice(0, 35)}` // Generic format
}