import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Rate limiting interface
interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; reset: number }>()

// Rate limiting function
export const rateLimit = async (
  identifier: string, 
  limit = 100, 
  windowMs = 3600000 // 1 hour
): Promise<RateLimitResult> => {
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const reset = windowStart + windowMs

  const key = `${identifier}:${windowStart}`
  const current = rateLimitStore.get(key) || { count: 0, reset }

  // Clean up old entries
  if (current.reset <= now) {
    rateLimitStore.delete(key)
    return { success: true, remaining: limit - 1, reset }
  }

  current.count += 1
  rateLimitStore.set(key, current)

  return {
    success: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    reset
  }
}

// API key authentication middleware
export const authenticateApiKey = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization')
  const apiKey = authorization?.replace('Bearer ', '') || request.headers.get('x-api-key')

  if (!apiKey) {
    return NextResponse.json(
      { 
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'API key required. Include it in Authorization header as "Bearer <key>" or X-API-Key header.' 
        } 
      },
      { status: 401 }
    )
  }

  // Find merchant by API key
  const merchant = await prisma.merchant.findUnique({
    where: { apiKey },
    include: {
      user: true,
    },
  })

  if (!merchant || !merchant.isActive) {
    return NextResponse.json(
      { 
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Invalid or inactive API key' 
        } 
      },
      { status: 401 }
    )
  }

  // Update last used timestamp
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { apiKeyLastUsed: new Date() },
  })

  return { merchant }
}

// Rate limiting middleware
export const rateLimitMiddleware = async (
  request: NextRequest,
  merchant: any,
  endpoint: string
) => {
  const identifier = `${merchant.id}:${endpoint}`
  const result = await rateLimit(
    identifier, 
    merchant.rateLimit || 100, 
    (merchant.rateLimitWindow || 3600) * 1000
  )

  if (!result.success) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Try again later.',
          details: {
            limit: merchant.rateLimit || 100,
            reset: new Date(result.reset).toISOString(),
          },
        },
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(merchant.rateLimit || 100),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.floor(result.reset / 1000)),
        },
      }
    )
  }

  return null
}

// Request validation middleware
export const validateRequest = <T>(schema: z.ZodSchema<T>) => {
  return async (request: NextRequest): Promise<{ data: T } | NextResponse> => {
    try {
      let body: any

      if (request.method !== 'GET') {
        const text = await request.text()
        body = text ? JSON.parse(text) : {}
      } else {
        const url = new URL(request.url)
        body = Object.fromEntries(url.searchParams.entries())
      }

      const data = schema.parse(body)
      return { data }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors.reduce((acc, err) => {
                const path = err.path.join('.')
                acc[path] = err.message
                return acc
              }, {} as Record<string, string>),
            },
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid request format',
          },
        },
        { status: 400 }
      )
    }
  }
}

// Error response formatter
export const formatErrorResponse = (error: any, requestId: string) => {
  console.error('API Error:', error)

  // Default error response
  let response = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    timestamp: new Date().toISOString(),
    requestId,
  }

  // Handle specific error types
  if (error.code === 'P2002' && error.meta?.target) {
    // Prisma unique constraint violation
    response.error = {
      code: 'CONFLICT',
      message: `Resource already exists: ${error.meta.target.join(', ')}`,
    }
  } else if (error.code === 'P2025') {
    // Prisma record not found
    response.error = {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    }
  } else if (error.message?.includes('Tatum API error')) {
    // Tatum API errors
    response.error = {
      code: 'EXTERNAL_API_ERROR',
      message: 'Cryptocurrency service temporarily unavailable',
    }
  } else if (error.message) {
    // Generic error with message
    response.error.message = error.message
  }

  return response
}

// Success response formatter
export const formatSuccessResponse = (data: any, requestId: string) => {
  return {
    data,
    timestamp: new Date().toISOString(),
    requestId,
  }
}

// Generate unique request ID
export const generateRequestId = () => {
  return crypto.randomUUID()
}

// CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
}

// API wrapper that combines all middleware
export const apiHandler = (handler: (request: NextRequest, context: any) => Promise<any>) => {
  return async (request: NextRequest, context: any = {}) => {
    const requestId = generateRequestId()

    try {
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 200, headers: corsHeaders })
      }

      // Authenticate API key
      const authResult = await authenticateApiKey(request)
      if (authResult instanceof NextResponse) {
        return new NextResponse(authResult.body, {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { merchant } = authResult
      context.merchant = merchant

      // Apply rate limiting
      const rateLimitResult = await rateLimitMiddleware(request, merchant, request.nextUrl.pathname)
      if (rateLimitResult) {
        return new NextResponse(rateLimitResult.body, {
          status: rateLimitResult.status,
          headers: { ...corsHeaders, ...Object.fromEntries(rateLimitResult.headers.entries()) },
        })
      }

      // Call the actual handler
      const result = await handler(request, { ...context, requestId })
      
      return NextResponse.json(
        formatSuccessResponse(result, requestId),
        { 
          status: 200,
          headers: corsHeaders,
        }
      )
    } catch (error) {
      const errorResponse = formatErrorResponse(error, requestId)
      const status = errorResponse.error.code === 'NOT_FOUND' ? 404 : 
                    errorResponse.error.code === 'CONFLICT' ? 409 : 
                    errorResponse.error.code === 'VALIDATION_ERROR' ? 400 : 
                    errorResponse.error.code === 'UNAUTHORIZED' ? 401 : 500

      return NextResponse.json(errorResponse, { 
        status,
        headers: corsHeaders,
      })
    }
  }
}

// Webhook signature verification
export const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')
  
  // Compare signatures using timingSafeEqual to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')
  const actualBuffer = Buffer.from(signature.replace('sha256=', ''), 'hex')
  
  return expectedBuffer.length === actualBuffer.length && 
         crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}