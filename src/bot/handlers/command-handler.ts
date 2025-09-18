import { promises as fs } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { logger, logError } from '@/shared/utils/logger';
import { BotClient } from '../client';
import { Command } from '../interfaces/command';

export class CommandHandler {
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
  }

  async loadCommands(): Promise<void> {
    try {
      const commandsPath = join(__dirname, '..', 'commands');
      const commandFolders = await fs.readdir(commandsPath);

      for (const folder of commandFolders) {
        const folderPath = join(commandsPath, folder);
        const stat = await fs.stat(folderPath);
        
        if (stat.isDirectory()) {
          const commandFiles = await fs.readdir(folderPath);
          
          for (const file of commandFiles) {
            // Only load .js files in production, .ts files in development
            const isProduction = process.env.NODE_ENV === 'production';
            const validExtension = isProduction ? file.endsWith('.js') : file.endsWith('.ts');
            
            // Skip declaration files
            if (file.endsWith('.d.ts')) continue;
            
            if (validExtension) {
              const filePath = join(folderPath, file);
              
              try {
                // Use require for production (CommonJS) and import for development
                let commandModule: any;
                if (process.env.NODE_ENV === 'production') {
                  commandModule = require(filePath);
                } else {
                  const fileUrl = pathToFileURL(filePath).href;
                  commandModule = await import(fileUrl);
                }
                
                const command: Command = commandModule.default || commandModule;
                
                if (this.isValidCommand(command)) {
                  this.client.commands.set(command.data.name, command);
                  logger.info(`Loaded command: ${command.data.name}`);
                } else {
                  logger.warn(`Invalid command structure in file: ${file}`);
                }
              } catch (error) {
                logError(error as Error, { 
                  context: 'CommandHandler.loadCommands',
                  file: filePath
                });
              }
            }
          }
        }
      }

      logger.info(`Loaded ${this.client.commands.size} commands`);
    } catch (error) {
      logError(error as Error, { context: 'CommandHandler.loadCommands' });
      throw error;
    }
  }

  private isValidCommand(command: any): command is Command {
    return (
      command &&
      typeof command.execute === 'function' &&
      command.data &&
      typeof command.data.name === 'string' &&
      typeof command.data.description === 'string'
    );
  }

  async reloadCommand(commandName: string): Promise<boolean> {
    try {
      // Remove from cache
      delete require.cache[require.resolve(`../commands/${commandName}`)];
      
      // Reload command
      const commandModule = await import(`../commands/${commandName}`);
      const command: Command = commandModule.default || commandModule;
      
      if (this.isValidCommand(command)) {
        this.client.commands.set(command.data.name, command);
        logger.info(`Reloaded command: ${command.data.name}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logError(error as Error, { 
        context: 'CommandHandler.reloadCommand',
        commandName
      });
      return false;
    }
  }
}