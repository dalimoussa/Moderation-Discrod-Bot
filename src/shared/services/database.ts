import knex, { Knex } from 'knex';
import { logger } from '@/shared/utils/logger';

export class DatabaseService {
  private client: Knex | null = null;
  
  async initialize(): Promise<void> {
    try {
      this.client = knex({
        client: 'postgresql',
        connection: {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        },
        pool: {
          min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
          max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200
        },
        migrations: {
          directory: './src/database/migrations',
          extension: 'ts'
        },
        seeds: {
          directory: './src/database/seeds',
          extension: 'ts'
        }
      });

      // Test connection
      await this.client.raw('SELECT 1');
      logger.info('Database connection established');
      
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  get connection(): Knex {
    if (!this.client) {
      throw new Error('Database not initialized');
    }
    return this.client;
  }

  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      logger.info('Database connection closed');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.raw('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Transaction wrapper
  async transaction<T>(callback: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
    if (!this.client) {
      throw new Error('Database not initialized');
    }
    
    return this.client.transaction(callback);
  }
}