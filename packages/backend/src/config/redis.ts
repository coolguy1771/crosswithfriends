import Redis from 'ioredis';
import {getEnv} from './env.js';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const env = getEnv();
    const redisUrl = env.REDIS_URL ?? 'redis://localhost:6379';

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redisClient.on('error', (err) => {
      // Only log errors, don't throw - app should continue without Redis if needed
      if (process.env.NODE_ENV !== 'test') {
        console.error('Redis Client Error:', err);
      }
    });

    redisClient.on('connect', () => {
      if (process.env.NODE_ENV !== 'test') {
        // eslint-disable-next-line no-console
        console.log('Redis Client Connected');
      }
    });
  }

  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
