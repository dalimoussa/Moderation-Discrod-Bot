import { Events, Message } from 'discord.js';
import { Event } from '../interfaces/event';
import { AutomodService } from '@/shared/services/automod';
import { LevelingService } from '@/shared/services/leveling';
import { logger } from '@/shared/utils/logger';

export default {
  name: Events.MessageCreate,
  
  async execute(message: Message): Promise<void> {
    // Ignore bot messages and system messages
    if (message.author.bot || !message.guild) return;

    try {
      // Process message through automod system
      const automodService = new AutomodService();
      const shouldDelete = await automodService.processMessage(message);
      
      // If automod didn't delete the message, process for leveling
      if (!shouldDelete) {
        const levelingService = new LevelingService();
        await levelingService.processMessage(message);
      }
    } catch (error) {
      logger.error('Error processing message:', error);
    }
  }
} satisfies Event<Events.MessageCreate>;