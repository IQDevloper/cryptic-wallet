import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { v4 as uuidv4 } from 'uuid'

// Error types
export interface ApiError extends Error {
  statusCode: number
  code: string
  details?: Record<string, any>
}

export class ValidationError extends Error implements ApiError {
  statusCode = 400
  code = 'VALIDATION_ERROR'
  details?: Record<string, any>

  constructor(message: string, details?: Record<string, any>) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
  }
}

export class AuthenticationError extends Error implements ApiError {
  statusCode = 401
  code = 'AUTHENTICATION_ERROR'

  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error implements ApiError {
  statusCode = 403
  code = 'AUTHORIZATION_ERROR'

  constructor(message: string = 'Access denied') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404
  code = 'NOT_FOUND'

  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends Error implements ApiError {
  statusCode = 429
  code = 'RATE_LIMIT_EXCEEDED'

  constructor(message: string = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class InternalServerError extends Error implements ApiError {
  statusCode = 500
  code = 'INTERNAL_SERVER_ERROR'

  constructor(message: string = 'Internal server error') {
    super(message)
    this.name = 'InternalServerError'
  }
}

// Response helpers
export function createSuccessResponse(data: any, requestId?: string) {
  return NextResponse.json({
    data,
    timestamp: new Date().toISOString(),
    requestId: requestId || uuidv4(),
  })
}

export function createErrorResponse(
  error: ApiError | Error,
  requestId?: string,
  statusCode?: number
): NextResponse {
  const id = requestId || uuidv4()
  
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors.reduce((acc, err) => {
            const path = err.path.join('.')
            acc[path] = err.message
            return acc
          }, {} as Record<string, string>),
        },
        timestamp: new Date().toISOString(),
        requestId: id,
      },
      { status: 400 }
    )
  }

  if ('statusCode' in error && 'code' in error) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        timestamp: new Date().toISOString(),
        requestId: id,
      },
      { status: error.statusCode }
    )
  }

  // Generic error handling
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
      },
      timestamp: new Date().toISOString(),
      requestId: id,
    },
    { status: statusCode || 500 }
  )
}

// Request ID middleware
export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || uuidv4()
}

// API key extraction
export function extractApiKey(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization) return null
  
  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7)
  }
  
  return null
}

// CORS headers for merchant API
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
}

// Generic API handler wrapper
export function withApiHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    const requestId = getRequestId(request)
    
    try {
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return NextResponse.json({}, { 
          status: 200, 
          headers: corsHeaders 
        })
      }

      const response = await handler(request, context)
      
      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    } catch (error) {
      console.error(`API Error [${requestId}]:`, error)
      
      const errorResponse = createErrorResponse(error as Error, requestId)
      
      // Add CORS headers to error response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        errorResponse.headers.set(key, value)
      })
      
      return errorResponse
    }
  }
}

// Rate limiting helpers (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  
  const current = rateLimitMap.get(identifier)
  
  if (!current || current.resetTime < windowStart) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= maxRequests) {
    return false
  }
  
  current.count++
  return true
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key)
    }
  }
}, 60000) // Clean up every minute