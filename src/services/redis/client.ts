import { env } from '@/config/env';
import Redis from 'ioredis';

class RedisService {
  private static instance: Redis;

  private constructor() {}

  public static getInstance(): Redis {
    if (!RedisService.instance) {
      const redisUrl = env.REDIS_URL || 'redis://localhost:6379';

      console.log('[Redis] Initializing connection...');

      RedisService.instance = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError(err) {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        },
      });

      RedisService.instance.on('connect', () => {
        console.log('[Redis] Connection established.');
      });

      RedisService.instance.on('error', err => {
        console.error('[Redis] Error:', err);
      });
    }

    return RedisService.instance;
  }
}

export const redis = RedisService.getInstance();
