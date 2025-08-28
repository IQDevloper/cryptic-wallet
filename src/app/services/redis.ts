import { Redis } from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost', // Use localhost when running app outside Docker
  port: parseInt(process.env.REDIS_PORT || '6379'), // Using fixed port 6379
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

if (!redisConfig.password) {
  throw new Error(
    'Redis password is not configured. Please set REDIS_PASSWORD environment variable.',
  );
}

class RedisService {
  private static instance: Redis;

  static getInstance(): Redis {
    if (!RedisService.instance) {
      console.log(
        `Connecting to Redis at ${redisConfig.host}:${redisConfig.port}`,
      );
      RedisService.instance = new Redis(redisConfig);
      this.setupEventListeners();
    }
    return RedisService.instance;
  }

  private static setupEventListeners() {
    RedisService.instance.on('connect', () => {
      console.log('Connected to Redis successfully');
    });

    RedisService.instance.on('error', (error) => {
      console.error('Redis connection error:', {
        message: error.message,
        host: redisConfig.host,
        port: redisConfig.port,
      });
    });
  }
}

export const redis = RedisService.getInstance();
