import { PrismaClient } from '@prisma/client'
import { ethers } from 'ethers'
import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from '@bitcoinerlab/secp256k1'
import TronWeb from 'tronweb'
import BIP32Factory from 'bip32'

const prisma = new PrismaClient()
const bip32 = BIP32Factory(ecc)

// Initialize bitcoin with secp256k1
bitcoin.initEccLib(ecc)

/**
 * Production-ready address generation for HD wallets
 * Supports multiple blockchain networks with proper derivation
 */
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

  // Generate real address based on the network type
  const address = await deriveRealAddress(
    globalWallet.xpub,
    globalWallet.derivationPath,
    Number(currentIndex),
    globalWallet.network,
    globalWallet.currency
  )

  // Store the derived address for tracking
  const derivedAddress = await prisma.derivedAddress.create({
    data: {
      globalWalletId,
      merchantId,
      address,
      derivationIndex: currentIndex,
    }
  })

  return {
    address,
    index: Number(currentIndex),
    derivationIndex: currentIndex,
    derivedAddressId: derivedAddress.id
  }
}

/**
 * Derive real cryptocurrency addresses based on network type
 */
async function deriveRealAddress(
  xpub: string,
  derivationPath: string,
  index: number,
  network: string,
  _currency: string
): Promise<string> {
  const networkLower = network.toLowerCase()
  
  // Handle EVM-compatible chains (Ethereum, BSC, Polygon, Arbitrum, Base)
  if (isEVMNetwork(networkLower)) {
    return deriveEVMAddress(xpub, derivationPath, index)
  }
  
  // Handle Bitcoin and Bitcoin-like chains
  if (networkLower.includes('bitcoin')) {
    return deriveBitcoinAddress(xpub, index, networkLower.includes('testnet'))
  }
  
  // Handle Litecoin
  if (networkLower.includes('litecoin')) {
    return deriveLitecoinAddress(xpub, index)
  }
  
  // Handle Dogecoin
  if (networkLower.includes('dogecoin')) {
    return deriveDogecoinAddress(xpub, index)
  }
  
  // Handle Dash
  if (networkLower.includes('dash')) {
    return deriveDashAddress(xpub, index)
  }
  
  // Handle TRON
  if (networkLower.includes('tron') || networkLower.includes('shasta')) {
    return deriveTronAddress(xpub, derivationPath, index)
  }
  
  // Handle Solana
  if (networkLower.includes('solana') || networkLower.includes('devnet')) {
    return deriveSolanaAddress(xpub, derivationPath, index)
  }
  
  // Handle Sui
  if (networkLower.includes('sui')) {
    return deriveSuiAddress(xpub, derivationPath, index)
  }
  
  throw new Error(`Unsupported network: ${network}`)
}

/**
 * Check if network is EVM-compatible
 */
function isEVMNetwork(network: string): boolean {
  const evmNetworks = [
    'ethereum', 'sepolia', 'goerli',
    'bsc', 'bsc-testnet',
    'polygon', 'amoy', 'mumbai',
    'arbitrum', 'arbitrum-sepolia',
    'base', 'base-sepolia',
    'optimism', 'optimism-sepolia',
    'avalanche', 'avalanche-fuji'
  ]
  
  return evmNetworks.some(evmNet => network.includes(evmNet))
}

/**
 * Derive address for EVM-compatible chains (Ethereum, BSC, Polygon, etc.)
 */
function deriveEVMAddress(xpub: string, _basePath: string, index: number): string {
  try {
    // Parse the xpub to get the HDNode
    const node = bip32.fromBase58(xpub)
    
    // Derive the child node at the specific index
    // For EVM chains, we typically use m/44'/60'/0'/0/index
    const childNode = node.derive(0).derive(index)
    
    // Get the public key
    const publicKey = childNode.publicKey
    
    // Create an Ethereum address from the public key
    const publicKeyBuffer = Buffer.from(publicKey)
    const publicKeyHex = publicKeyBuffer.toString('hex')
    
    // Use ethers to compute the address from public key
    const address = ethers.computeAddress('0x' + publicKeyHex)
    
    return address
  } catch (error) {
    console.error('Error deriving EVM address:', error)
    // Fallback to HD wallet derivation using ethers
    const hdNode = ethers.HDNodeWallet.fromExtendedKey(xpub)
    const child = hdNode.derivePath(`0/${index}`)
    return child.address
  }
}

/**
 * Derive Bitcoin address from xpub
 */
function deriveBitcoinAddress(xpub: string, index: number, isTestnet: boolean = false): string {
  try {
    // Select the appropriate network
    const network = isTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
    
    // Parse the xpub
    const node = bip32.fromBase58(xpub, network)
    
    // Derive the child node (m/0/index for receiving addresses)
    const child = node.derive(0).derive(index)
    
    // Generate P2PKH address (legacy format starting with 1 or m/n for testnet)
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: Buffer.from(child.publicKey),
      network: network
    })
    
    if (!address) {
      throw new Error('Failed to generate Bitcoin address')
    }
    
    return address
  } catch (error) {
    console.error('Error deriving Bitcoin address:', error)
    throw new Error(`Failed to derive Bitcoin address: ${error}`)
  }
}

/**
 * Derive Litecoin address
 */
function deriveLitecoinAddress(xpub: string, index: number): string {
  try {
    // Litecoin network configuration
    const litecoinNetwork = {
      messagePrefix: '\x19Litecoin Signed Message:\n',
      bech32: 'ltc',
      bip32: {
        public: 0x019da462,
        private: 0x019d9cfe,
      },
      pubKeyHash: 0x30, // L addresses
      scriptHash: 0x32, // M addresses (P2SH)
      wif: 0xb0,
    }
    
    const node = bip32.fromBase58(xpub, litecoinNetwork)
    const child = node.derive(0).derive(index)
    
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: Buffer.from(child.publicKey),
      network: litecoinNetwork as any
    })
    
    if (!address) {
      throw new Error('Failed to generate Litecoin address')
    }
    
    return address
  } catch (error) {
    console.error('Error deriving Litecoin address:', error)
    throw new Error(`Failed to derive Litecoin address: ${error}`)
  }
}

/**
 * Derive Dogecoin address
 */
function deriveDogecoinAddress(xpub: string, index: number): string {
  try {
    // Dogecoin network configuration
    const dogecoinNetwork = {
      messagePrefix: '\x19Dogecoin Signed Message:\n',
      bech32: 'doge',
      bip32: {
        public: 0x02facafd,
        private: 0x02fac398,
      },
      pubKeyHash: 0x1e, // D addresses
      scriptHash: 0x16, // 9 addresses (P2SH)
      wif: 0x9e,
    }
    
    const node = bip32.fromBase58(xpub, dogecoinNetwork)
    const child = node.derive(0).derive(index)
    
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: Buffer.from(child.publicKey),
      network: dogecoinNetwork as any
    })
    
    if (!address) {
      throw new Error('Failed to generate Dogecoin address')
    }
    
    return address
  } catch (error) {
    console.error('Error deriving Dogecoin address:', error)
    throw new Error(`Failed to derive Dogecoin address: ${error}`)
  }
}

/**
 * Derive Dash address
 */
function deriveDashAddress(xpub: string, index: number): string {
  try {
    // Dash network configuration
    const dashNetwork = {
      messagePrefix: '\x19DarkCoin Signed Message:\n',
      bech32: 'dash',
      bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4,
      },
      pubKeyHash: 0x4c, // X addresses
      scriptHash: 0x10, // 7 addresses (P2SH)
      wif: 0xcc,
    }
    
    const node = bip32.fromBase58(xpub, dashNetwork)
    const child = node.derive(0).derive(index)
    
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: Buffer.from(child.publicKey),
      network: dashNetwork as any
    })
    
    if (!address) {
      throw new Error('Failed to generate Dash address')
    }
    
    return address
  } catch (error) {
    console.error('Error deriving Dash address:', error)
    throw new Error(`Failed to derive Dash address: ${error}`)
  }
}

/**
 * Derive TRON address
 */
function deriveTronAddress(xpub: string, _basePath: string, index: number): string {
  try {
    // Parse the xpub to get the HDNode
    const node = bip32.fromBase58(xpub)
    
    // Derive the child node at the specific index
    const childNode = node.derive(0).derive(index)
    
    // Get the public key
    const publicKey = childNode.publicKey
    
    // Convert public key to TRON address
    const publicKeyBuffer = Buffer.from(publicKey)
    const publicKeyHex = publicKeyBuffer.toString('hex')
    
    // Use ethers to compute Ethereum-style address, then convert to TRON
    const ethAddress = ethers.computeAddress('0x' + publicKeyHex)
    // Replace 0x with 41 for TRON mainnet
    const tronHex = '41' + ethAddress.slice(2)
    
    // Convert hex to base58 TRON address using utils
    const address = TronWeb.utils.address.fromHex(tronHex)
    
    return address
  } catch (error) {
    console.error('Error deriving TRON address:', error)
    // Fallback: generate from hex
    try {
      const node = bip32.fromBase58(xpub)
      const child = node.derive(0).derive(index)
      
      // Convert public key properly for ethers
      const publicKeyBuffer = Buffer.from(child.publicKey)
      const publicKeyHex = publicKeyBuffer.toString('hex')
      
      // Use ethers to compute Ethereum-style address, then convert to TRON
      const ethAddress = ethers.computeAddress('0x' + publicKeyHex)
      // Replace 0x with 41 for TRON mainnet
      const tronHex = '41' + ethAddress.slice(2)
      
      // Convert hex to base58 TRON address using utils
      return TronWeb.utils.address.fromHex(tronHex)
    } catch (fallbackError) {
      throw new Error(`Failed to derive TRON address: ${error}`)
    }
  }
}

/**
 * Derive Solana address
 * Note: Solana uses Ed25519 curve, not secp256k1
 * This is a simplified implementation - production should use @solana/web3.js
 */
function deriveSolanaAddress(_xpub: string, _basePath: string, _index: number): string {
  // Solana address derivation requires Ed25519 keys
  // This is a placeholder - real implementation would need @solana/web3.js
  // and proper Ed25519 key derivation
  throw new Error('Solana address derivation requires Ed25519 keys - not yet implemented')
}

/**
 * Derive Sui address
 * Note: Sui uses Ed25519 curve, similar to Solana
 */
function deriveSuiAddress(_xpub: string, _basePath: string, _index: number): string {
  // Sui address derivation requires Ed25519 keys
  // This is a placeholder - real implementation would need @mysten/sui.js
  throw new Error('Sui address derivation requires Ed25519 keys - not yet implemented')
}

/**
 * Export utility function to validate addresses
 */
export function isValidAddress(address: string, network: string): boolean {
  const networkLower = network.toLowerCase()
  
  // EVM address validation
  if (isEVMNetwork(networkLower)) {
    return ethers.isAddress(address)
  }
  
  // Bitcoin address validation
  if (networkLower.includes('bitcoin')) {
    try {
      bitcoin.address.toOutputScript(
        address, 
        networkLower.includes('testnet') ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
      )
      return true
    } catch {
      return false
    }
  }
  
  // TRON address validation
  if (networkLower.includes('tron')) {
    return TronWeb.utils.address.isAddress(address)
  }
  
  // For other networks, basic validation
  return address.length > 20 && address.length < 100
}