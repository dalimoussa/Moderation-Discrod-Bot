import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'aegis-bot' },
  transports: [
    // Console transport with colors for development
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      )
    }),

    // File transport for all logs
    new DailyRotateFile({
      filename: 'logs/aegis-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    }),

    // Separate file for errors
    new DailyRotateFile({
      filename: 'logs/aegis-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/exceptions.log',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/rejections.log',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    })
  ]
});

// Create a stream object for morgan HTTP request logging
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// Utility functions for structured logging
export const createChildLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context
  });
};

export const logCommand = (commandName: string, userId: string, guildId: string, success: boolean, duration?: number) => {
  logger.info(`Command: ${commandName} | User: ${userId} | Guild: ${guildId} | Success: ${success} | Duration: ${duration}ms`);
};

export const logModeration = (action: string, targetId: string, moderatorId: string, guildId: string, reason?: string) => {
  logger.info({
    type: 'moderation_action',
    action,
    targetId,
    moderatorId,
    guildId,
    reason
  });
};