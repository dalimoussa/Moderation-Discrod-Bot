import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  Collection,
  ApplicationCommandDataResolvable,
  ClientEvents,
  REST,
  Routes
} from 'discord.js';
import { logger, logError } from '../shared/utils/logger';
import { DatabaseService } from '../shared/services/database';
import { RedisService } from '../shared/services/redis';
import { CommandHandler } from './handlers/command-handler';
import { EventHandler } from './handlers/event-handler';
import { Command } from './interfaces/command';

interface BotClientOptions {
  database: DatabaseService;
  redis: RedisService;
}

export class BotClient extends Client {
  public commands: Collection<string, Command> = new Collection();
  public cooldowns: Collection<string, Collection<string, number>> = new Collection();
  public database: DatabaseService;
  public redis: RedisService;
  private commandHandler: CommandHandler;
  private eventHandler: EventHandler;

  constructor(options: BotClientOptions) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
      ],
      allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: false
      }
    });

    this.database = options.database;
    this.redis = options.redis;
    this.commandHandler = new CommandHandler(this);
    this.eventHandler = new EventHandler(this);
  }

  async initialize(): Promise<void> {
    try {
      // Load commands and events
      await this.commandHandler.loadCommands();
      await this.eventHandler.loadEvents();

      // Login to Discord first so we have guild cache for per-guild registration
      await this.login(process.env.DISCORD_TOKEN);

      // Register slash commands (global + per-guild for instant updates)
      await this.registerSlashCommands();
      
      logger.info('Bot client initialized successfully');
    } catch (error) {
      logError(error as Error, { context: 'BotClient.initialize' });
      throw error;
    }
  }

  private async registerSlashCommands(): Promise<void> {
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
      
      const commandData: ApplicationCommandDataResolvable[] = [];
      this.commands.forEach(command => {
        if (command.data) {
          commandData.push(command.data.toJSON());
        }
      });

      logger.info(`Started refreshing ${commandData.length} application (/) commands.`);

      // Register global commands - they work with proper scope
      await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
        { body: commandData }
      );
      logger.info('Successfully registered global commands');

      // Optional: Register per-guild ONLY in development mode for instant updates
      // Comment out or remove this section to prevent duplicates
      if (process.env.NODE_ENV === 'development' && process.env.DEV_GUILD_ID) {
        const devGuildIds = process.env.DEV_GUILD_ID.split(',').map(id => id.trim()).filter(Boolean);
        
        for (const guildId of devGuildIds) {
          try {
            await rest.put(
              Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, guildId),
              { body: commandData }
            );
            logger.info(`Registered dev guild commands for guild ${guildId}`);
          } catch (e) {
            logger.warn(`Failed to register guild commands for ${guildId}:`, e);
          }
        }
      } else {
        logger.info('Skipping guild command registration - using global commands only');
      }

    } catch (error) {
      logError(error as Error, { context: 'registerSlashCommands' });
      throw error;
    }
  }

  async destroy(): Promise<void> {
    logger.info('Shutting down bot client...');
    super.destroy();
  }

  // Utility methods
  isReady(): this is Client<true> {
    return this.readyAt !== null;
  }

  getGuildCount(): number {
    return this.guilds.cache.size;
  }

  getUserCount(): number {
    return this.users.cache.size;
  }

  // Event wrapper for better error handling
  emit<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]): boolean {
    try {
      return super.emit(event, ...args);
    } catch (error) {
      logError(error as Error, { 
        context: 'BotClient.emit',
        event: event.toString()
      });
      return false;
    }
  }
}