import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export class RedisService {
  private client: RedisClientType | null = null;
  
  async initialize(): Promise<void> {
    try {
      // Skip Redis initialization if no URL is provided
      if (!process.env.REDIS_URL) {
        logger.info('No REDIS_URL provided, skipping Redis initialization');
        return;
      }

      const redisOptions: any = {
        url: process.env.REDIS_URL,
        database: parseInt(process.env.REDIS_DB || '0'),
        socket: {
          reconnectStrategy: (retries: number) => {
            const delay = Math.min(retries * 50, 2000);
            return delay;
          }
        }
      };

      if (process.env.REDIS_PASSWORD) {
        redisOptions.password = process.env.REDIS_PASSWORD;
      }

      this.client = createClient(redisOptions);

      // Event handlers
      this.client.on('connect', () => {
        logger.info('Redis connection established');
      });

      this.client.on('error', (error: Error) => {
        logger.error('Redis connection error:', error);
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      // Connect to Redis
      await this.client.connect();
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  get connection(): RedisClientType | null {
    return this.client;
  }

  isConnected(): boolean {
    return !!this.client;
  }

  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis connection closed');
    } else {
      logger.info('Redis was not initialized, nothing to destroy');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        logger.info('Redis not initialized, health check skipped');
        return true; // Return true since Redis is optional
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Cache utilities
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client) {
        logger.debug(`Redis not available, skipping get for key: ${key}`);
        return null;
      }
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Failed to get key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      if (!this.client) {
        logger.debug(`Redis not available, skipping set for key: ${key}`);
        return false;
      }
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Failed to set key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.client) {
        logger.debug(`Redis not available, skipping delete for key: ${key}`);
        return false;
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Failed to delete key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client) {
        logger.debug(`Redis not available, skipping exists check for key: ${key}`);
        return false;
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to check existence of key ${key}:`, error);
      return false;
    }
  }

  // Rate limiting utilities
  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; count: number; resetTime: number }> {
    try {
      if (!this.client) {
        logger.debug(`Redis not available, allowing rate limit for key: ${key}`);
        return { allowed: true, count: 0, resetTime: Date.now() + window * 1000 };
      }

      const now = Date.now();
      const windowStart = now - window * 1000;
      
      const multi = this.client.multi();
      multi.zRemRangeByScore(key, 0, windowStart);
      multi.zAdd(key, { score: now, value: now.toString() });
      multi.zCard(key);
      multi.expire(key, window);
      
      const results = await multi.exec();
      const count = results?.[2] as number || 0;
      
      return {
        allowed: count <= limit,
        count,
        resetTime: now + window * 1000
      };
    } catch (error) {
      logger.error(`Rate limit check failed for key ${key}:`, error);
      return { allowed: true, count: 0, resetTime: Date.now() };
    }
  }
}