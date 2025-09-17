import { Events } from 'discord.js';
import { Event } from '../interfaces/event';
import { logger } from '@/shared/utils/logger';

export default {
  name: Events.ClientReady,
  once: true,
  
  async execute(client): Promise<void> {
    logger.info(`Bot is ready! Logged in as ${client.user?.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);
    
    // Set bot status
    client.user?.setPresence({
      activities: [{
        name: `${client.guilds.cache.size} servers`,
        type: 3 // Watching
      }],
      status: 'online'
    });

    // Update guild count periodically
    setInterval(() => {
      client.user?.setPresence({
        activities: [{
          name: `${client.guilds.cache.size} servers`,
          type: 3
        }]
      });
    }, 300000); // Every 5 minutes
  }
} satisfies Event<Events.ClientReady>;