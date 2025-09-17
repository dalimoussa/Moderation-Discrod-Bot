import { Events, GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { Event } from '../interfaces/event';
import { logger } from '@/shared/utils/logger';
import knex from 'knex';
// Use compiled CommonJS knex configuration to avoid TS rootDir issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('../../../knexfile.js');

const environment = process.env.NODE_ENV || 'development';
const knexConfig = (config as any)[environment];
const db = knex(knexConfig);

export const guildMemberAdd: Event = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(...args) {
    const [member] = args as [GuildMember];
    
    try {
      // Get welcome settings for this guild
      const welcomeSettings = await db
        .select('*')
        .from('welcome_settings')
        .where('guild_id', member.guild.id)
        .first();

      if (!welcomeSettings || !welcomeSettings.enabled || !welcomeSettings.channel_id) {
        return; // Welcome system not configured or disabled
      }

      const welcomeChannel = member.guild.channels.cache.get(welcomeSettings.channel_id) as TextChannel;
      if (!welcomeChannel) {
        logger.warn(`Welcome channel ${welcomeSettings.channel_id} not found in guild ${member.guild.id}`);
        return;
      }

      // Replace placeholders in welcome message
      const welcomeMessage = welcomeSettings.welcome_message
        .replace('{user}', `<@${member.id}>`)
        .replace('{username}', member.user.username)
        .replace('{server}', member.guild.name)
        .replace('{memberCount}', member.guild.memberCount.toString());

      // Create welcome embed
      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`Welcome to ${member.guild.name}! 🎉`)
        .setDescription(welcomeMessage)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields([
          { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: `User ID: ${member.id}` });

      await welcomeChannel.send({ 
        content: `<@${member.id}>`,
        embeds: [welcomeEmbed] 
      });

      // Add welcome role if configured
      if (welcomeSettings.welcome_role_id) {
        const welcomeRole = member.guild.roles.cache.get(welcomeSettings.welcome_role_id);
        if (welcomeRole) {
          await member.roles.add(welcomeRole);
          logger.info(`Added welcome role ${welcomeRole.name} to ${member.user.username}`);
        }
      }

      logger.info(`Welcomed new member: ${member.user.username} to ${member.guild.name}`);

    } catch (error) {
      logger.error('Error in guildMemberAdd event:', error);
    }
  }
};

export default guildMemberAdd;