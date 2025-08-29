import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

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
  
  const seed = `${currency}-${network}-${index}`
  const hash = crypto.createHash('sha256').update(seed).digest('hex')
  
  switch (network.toLowerCase()) {
    case 'bitcoin':
      return `1${hash.slice(0, 32)}` // Bitcoin legacy address format
    case 'ethereum':
    case 'bsc':
    case 'polygon':
      return `0x${hash.slice(0, 40)}` // Ethereum address format
    case 'tron':
      return `T${hash.slice(0, 33)}` // TRON address format
    default:
      return `addr_${hash.slice(0, 35)}` // Generic format
  }
}