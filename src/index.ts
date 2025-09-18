import 'dotenv/config';
import { logger } from './shared/utils/logger';
import { BotClient } from './bot/client';
import { DatabaseService } from './shared/services/database';
import { RedisService } from './shared/services/redis';

async function bootstrap(): Promise<void> {
  try {
    logger.info('Starting Aegis Discord Bot...');
    logger.info('Environment:', process.env.NODE_ENV || 'undefined');
    logger.info('Database URL configured:', !!process.env.DATABASE_URL);
    logger.info('Discord token configured:', !!process.env.DISCORD_TOKEN);
    
    // Initialize services
    logger.info('Initializing database connection...');
    const database = new DatabaseService();
    await database.initialize();
    logger.info('Database connected successfully');
    
    logger.info('Initializing Redis connection...');
    const redis = new RedisService();
    await redis.initialize();
    logger.info('Redis connected successfully');
    
    // Initialize bot
    logger.info('Initializing Discord bot client...');
    const bot = new BotClient({
      database,
      redis
    });
    
    await bot.initialize();
    logger.info('Bot initialized successfully');
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await bot.destroy();
      await database.destroy();
      await redis.destroy();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await bot.destroy();
      await database.destroy();
      await redis.destroy();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

bootstrap();