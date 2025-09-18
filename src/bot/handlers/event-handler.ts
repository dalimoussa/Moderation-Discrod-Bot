import { promises as fs } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { logger, logError } from '@/shared/utils/logger';
import { BotClient } from '../client';
import { Event } from '../interfaces/event';

export class EventHandler {
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
  }

  async loadEvents(): Promise<void> {
    try {
      const eventsPath = join(__dirname, '..', 'events');
      const eventFiles = await fs.readdir(eventsPath);

      for (const file of eventFiles) {
        // Only load .js files in production, .ts files in development
        const isProduction = process.env.NODE_ENV === 'production';
        const validExtension = isProduction ? file.endsWith('.js') : file.endsWith('.ts');
        
        // Skip declaration files
        if (file.endsWith('.d.ts')) continue;
        
        if (validExtension) {
          const filePath = join(eventsPath, file);
          
          try {
            // Use require for production (CommonJS) and import for development
            let eventModule: any;
            if (process.env.NODE_ENV === 'production') {
              eventModule = require(filePath);
            } else {
              const fileUrl = pathToFileURL(filePath).href;
              eventModule = await import(fileUrl);
            }
            
            const event: Event = eventModule.default || eventModule;
            
            if (this.isValidEvent(event)) {
              if (event.once) {
                this.client.once(event.name, (...args) => 
                  this.executeEvent(event, ...args)
                );
              } else {
                this.client.on(event.name, (...args) => 
                  this.executeEvent(event, ...args)
                );
              }
              
              logger.info(`Loaded event: ${event.name}`);
            } else {
              logger.warn(`Invalid event structure in file: ${file}`);
            }
          } catch (error) {
            logError(error as Error, { 
              context: 'EventHandler.loadEvents',
              file: filePath
            });
          }
        }
      }

      logger.info('Events loaded successfully');
    } catch (error) {
      logError(error as Error, { context: 'EventHandler.loadEvents' });
      throw error;
    }
  }

  private isValidEvent(event: any): event is Event {
    return (
      event &&
      typeof event.name === 'string' &&
      typeof event.execute === 'function'
    );
  }

  private async executeEvent(event: Event, ...args: unknown[]): Promise<void> {
    try {
      await (event.execute as (...args: unknown[]) => Promise<void>)(...args);
    } catch (error) {
      logError(error as Error, { 
        context: 'EventHandler.executeEvent',
        eventName: event.name
      });
    }
  }
}