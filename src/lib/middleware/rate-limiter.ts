import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

// Redis client (optional - will fall back to in-memory if not available)
let redis: Redis | null = null;

try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  }
} catch (error) {
  console.warn('Redis not available, using in-memory rate limiting:', error);
}

// In-memory rate limit store (fallback when Redis is not available)
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests toward limit
  skipFailedRequests?: boolean; // Don't count failed requests toward limit
  message?: string; // Custom error message
  standardHeaders?: boolean; // Add standard rate limit headers
}

export class WebhookRateLimiter {
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (request) => this.getClientIdentifier(request),
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later.',
      standardHeaders: true,
      ...config,
    };
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(request: NextRequest): string {
    // Try to get IP address from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');

    const ip = forwarded?.split(',')[0]?.trim() || realIP || 'unknown';

    // Include user agent for more granular rate limiting
    const userAgent = request.headers.get('user-agent') || 'unknown';

    return `${ip}:${this.hashUserAgent(userAgent)}`;
  }

  /**
   * Hash user agent to create shorter, consistent identifier
   */
  private hashUserAgent(userAgent: string): string {
    let hash = 0;
    for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Redis-based rate limiting
   */
  private async checkRateLimitRedis(key: string): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: Date;
  }> {
    if (!redis) {
      throw new Error('Redis not available');
    }

    const now = Date.now();
    const window = Math.floor(now / this.config.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;

    try {
      const pipeline = redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, Math.ceil(this.config.windowMs / 1000));

      const results = await pipeline.exec();
      const count = (results?.[0]?.[1] as number) || 0;

      const allowed = count <= this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - count);
      const resetTime = new Date((window + 1) * this.config.windowMs);

      return {
        allowed,
        limit: this.config.maxRequests,
        remaining,
        resetTime,
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fall back to in-memory on Redis error
      return this.checkRateLimitMemory(key);
    }
  }

  /**
   * In-memory rate limiting (fallback)
   */
  private async checkRateLimitMemory(key: string): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: Date;
  }> {
    const now = Date.now();
    const window = Math.floor(now / this.config.windowMs);
    const resetTime = new Date((window + 1) * this.config.windowMs);

    const current = inMemoryStore.get(key);

    if (!current || current.resetTime !== window) {
      // New window or first request
      inMemoryStore.set(key, { count: 1, resetTime: window });

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime,
      };
    } else {
      // Increment count
      current.count++;
      inMemoryStore.set(key, current);

      const allowed = current.count <= this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - current.count);

      return {
        allowed,
        limit: this.config.maxRequests,
        remaining,
        resetTime,
      };
    }
  }

  /**
   * Main rate limiting check
   */
  async checkRateLimit(request: NextRequest): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: Date;
  }> {
    const key = this.config.keyGenerator(request);

    try {
      if (redis) {
        return await this.checkRateLimitRedis(key);
      } else {
        return await this.checkRateLimitMemory(key);
      }
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Allow request on error to avoid blocking legitimate traffic
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: new Date(Date.now() + this.config.windowMs),
      };
    }
  }

  /**
   * Middleware function for Next.js
   */
  async middleware(request: NextRequest): Promise<NextResponse | null> {
    const result = await this.checkRateLimit(request);

    if (!result.allowed) {
      // Rate limit exceeded
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: this.config.message,
          retryAfter: Math.ceil(
            (result.resetTime.getTime() - Date.now()) / 1000,
          ),
        },
        { status: 429 },
      );

      if (this.config.standardHeaders) {
        response.headers.set('X-RateLimit-Limit', result.limit.toString());
        response.headers.set('X-RateLimit-Remaining', '0');
        response.headers.set(
          'X-RateLimit-Reset',
          Math.ceil(result.resetTime.getTime() / 1000).toString(),
        );
        response.headers.set(
          'Retry-After',
          Math.ceil(
            (result.resetTime.getTime() - Date.now()) / 1000,
          ).toString(),
        );
      }

      return response;
    }

    // Add rate limit headers to successful responses
    if (this.config.standardHeaders) {
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        result.remaining.toString(),
      );
      response.headers.set(
        'X-RateLimit-Reset',
        Math.ceil(result.resetTime.getTime() / 1000).toString(),
      );
      return response;
    }

    return null; // Continue with request
  }

  /**
   * Clean up expired entries from in-memory store
   */
  static cleanupMemoryStore(): number {
    const now = Date.now();
    const currentWindow = Math.floor(now / 60000); // Clean up windows older than 1 minute

    let cleaned = 0;
    for (const [key, data] of inMemoryStore.entries()) {
      if (data.resetTime < currentWindow - 1) {
        // Keep some buffer
        inMemoryStore.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Predefined rate limiters for common use cases
export const webhookRateLimiter = new WebhookRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message:
    'Too many webhook requests. Please check your webhook configuration.',
});

export const strictWebhookRateLimiter = new WebhookRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  message: 'Rate limit exceeded for webhook endpoint.',
});

export const apiRateLimiter = new WebhookRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000, // 1000 requests per minute
  message: 'API rate limit exceeded.',
});

// Clean up memory store periodically
if (typeof global !== 'undefined') {
  const cleanupInterval = setInterval(() => {
    const cleaned = WebhookRateLimiter.cleanupMemoryStore();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }, 60000); // Clean up every minute

  // Clean up interval on process exit
  process.on('beforeExit', () => {
    clearInterval(cleanupInterval);
  });
}
