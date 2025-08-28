import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { 
  AuthenticationError, 
  AuthorizationError, 
  RateLimitError,
  extractApiKey,
  checkRateLimit 
} from './utils'

const prisma = new PrismaClient()

export interface MerchantContext {
  merchant: {
    id: string
    name: string
    email: string
    webhookUrl: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }
  requestId: string
}

// Merchant authentication middleware
export async function authenticateMerchant(request: NextRequest, requestId: string): Promise<MerchantContext> {
  const apiKey = extractApiKey(request)
  
  if (!apiKey) {
    throw new AuthenticationError('API key required. Please provide a valid API key in the Authorization header.')
  }

  // Check rate limit based on API key
  if (!checkRateLimit(`merchant:${apiKey}`, 100, 60000)) {
    throw new RateLimitError('Rate limit exceeded. Please try again later.')
  }

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: {
        id: true,
        name: true,
        email: true,
        webhookUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!merchant) {
      throw new AuthenticationError('Invalid API key. Please check your credentials.')
    }

    if (!merchant.isActive) {
      throw new AuthorizationError('Merchant account is inactive. Please contact support.')
    }

    return {
      merchant,
      requestId,
    }
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      throw error
    }
    
    console.error('Merchant authentication error:', error)
    throw new AuthenticationError('Authentication failed. Please try again.')
  }
}

// Enhanced merchant authentication with additional checks
export async function authenticateMerchantWithAccess(
  request: NextRequest,
  requestId: string,
  requiredPermissions?: string[]
): Promise<MerchantContext> {
  const context = await authenticateMerchant(request, requestId)
  
  // Add permission checks here if needed in the future
  // For now, all authenticated merchants have full access
  
  return context
}

// Validate merchant owns resource
export async function validateMerchantOwnership(
  merchantId: string,
  resourceType: 'invoice' | 'wallet' | 'transaction',
  resourceId: string
): Promise<boolean> {
  try {
    switch (resourceType) {
      case 'invoice':
        const invoice = await prisma.invoice.findFirst({
          where: {
            id: resourceId,
            merchantId,
          },
        })
        return !!invoice

      case 'wallet':
        const wallet = await prisma.wallet.findFirst({
          where: {
            id: resourceId,
            merchantId,
          },
        })
        return !!wallet

      case 'transaction':
        const transaction = await prisma.transaction.findFirst({
          where: {
            id: resourceId,
            invoice: {
              merchantId,
            },
          },
        })
        return !!transaction

      default:
        return false
    }
  } catch (error) {
    console.error('Ownership validation error:', error)
    return false
  }
}

// Get merchant statistics for rate limiting and monitoring
export async function getMerchantStats(merchantId: string, timeWindow: number = 3600000): Promise<{
  invoiceCount: number
  transactionCount: number
  lastActivity: Date | null
}> {
  const since = new Date(Date.now() - timeWindow)
  
  try {
    const [invoiceCount, transactionCount, lastInvoice] = await Promise.all([
      prisma.invoice.count({
        where: {
          merchantId,
          createdAt: { gte: since },
        },
      }),
      prisma.transaction.count({
        where: {
          invoice: { merchantId },
          createdAt: { gte: since },
        },
      }),
      prisma.invoice.findFirst({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ])

    return {
      invoiceCount,
      transactionCount,
      lastActivity: lastInvoice?.createdAt || null,
    }
  } catch (error) {
    console.error('Error fetching merchant stats:', error)
    return {
      invoiceCount: 0,
      transactionCount: 0,
      lastActivity: null,
    }
  }
}