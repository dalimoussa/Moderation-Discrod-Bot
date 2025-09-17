import { 
  Message, 
  TextChannel, 
  EmbedBuilder, 
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { logger } from '@/shared/utils/logger';
import knex from 'knex';

// Use compiled CommonJS knex configuration
const config = require('../../../knexfile.js');
const environment = process.env.NODE_ENV || 'development';
const knexConfig = (config as any)[environment];
const db = knex(knexConfig);

interface AutomodConfig {
  enabled: boolean;
  filters: {
    profanity: { enabled: boolean; severity: 'low' | 'medium' | 'high'; customWords: string[] };
    spam: { enabled: boolean; maxMessages: number; timeWindow: number; maxDuplicates: number };
    links: { enabled: boolean; whitelist: string[]; blockInvites: boolean };
    caps: { enabled: boolean; maxPercentage: number; minLength: number };
    mentions: { enabled: boolean; maxMentions: number; maxRoleMentions: number };
    zalgo: { enabled: boolean; threshold: number };
  };
  thresholds: {
    autoban: { violations: number; timeWindow: number };
    automute: { violations: number; timeWindow: number; duration: number };
  };
  exemptions: {
    roles: string[];
    channels: string[];
    users: string[];
  };
  actions: {
    delete: boolean;
    warn: boolean;
    log: boolean;
    dm: boolean;
  };
  logChannelId?: string;
}

interface SpamTracker {
  messages: { content: string; timestamp: number }[];
  violations: number;
  lastViolation: number;
}

export class AutomodService {
  private spamTrackers = new Map<string, SpamTracker>();
  private profanityWords = new Set([
    // Basic profanity list - in production, use a comprehensive database
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard',
    // Add more words or load from external API/database
  ]);

  private zalgoRegex = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g;

  async processMessage(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    try {
      const config = await this.getGuildConfig(message.guild.id);
      logger.info(`Automod processing message - enabled: ${config.enabled}, content: "${message.content}"`);
      
      if (!config.enabled) {
        logger.info('Automod is disabled for this guild');
        return false;
      }

      // Check exemptions
      if (this.isExempt(message, config)) {
        logger.info('Message author is exempt from automod');
        return false;
      }

      const violations: string[] = [];

      // Profanity filter
      if (config.filters.profanity.enabled) {
        const profanityResult = this.checkProfanity(message.content, config.filters.profanity);
        logger.info(`Profanity check result: ${profanityResult.violation}, words: ${profanityResult.words?.join(', ') || 'none'}`);
        if (profanityResult.violation) violations.push('profanity');
      }

      // Spam detection
      if (config.filters.spam.enabled) {
        const spamResult = this.checkSpam(message, config.filters.spam);
        if (spamResult.violation) violations.push('spam');
      }

      // Link filtering
      if (config.filters.links.enabled) {
        const linkResult = this.checkLinks(message.content, config.filters.links);
        if (linkResult.violation) violations.push('links');
      }

      // Caps filter
      if (config.filters.caps.enabled) {
        const capsResult = this.checkCaps(message.content, config.filters.caps);
        if (capsResult.violation) violations.push('caps');
      }

      // Mention spam
      if (config.filters.mentions.enabled) {
        const mentionResult = this.checkMentions(message, config.filters.mentions);
        if (mentionResult.violation) violations.push('mentions');
      }

      // Zalgo text
      if (config.filters.zalgo.enabled) {
        const zalgoResult = this.checkZalgo(message.content, config.filters.zalgo);
        if (zalgoResult.violation) violations.push('zalgo');
      }

      if (violations.length > 0) {
        logger.info(`Automod violations detected: ${violations.join(', ')} - handling violations`);
        await this.handleViolations(message, violations, config);
        return true;
      }

      logger.info('No automod violations detected');
      return false;
    } catch (error) {
      logger.error('Error in automod processing:', error);
      return false;
    }
  }

  private async getGuildConfig(guildId: string): Promise<AutomodConfig> {
    try {
      const result = await db('automod_config')
        .where('guild_id', guildId)
        .first();

      if (!result) {
        // Return default config
        return {
          enabled: false,
          filters: {
            profanity: { enabled: true, severity: 'medium', customWords: [] },
            spam: { enabled: true, maxMessages: 5, timeWindow: 10, maxDuplicates: 3 },
            links: { enabled: false, whitelist: [], blockInvites: true },
            caps: { enabled: true, maxPercentage: 70, minLength: 6 },
            mentions: { enabled: true, maxMentions: 5, maxRoleMentions: 2 },
            zalgo: { enabled: true, threshold: 0.5 }
          },
          thresholds: {
            autoban: { violations: 10, timeWindow: 300 },
            automute: { violations: 5, timeWindow: 300, duration: 600 }
          },
          exemptions: { roles: [], channels: [], users: [] },
          actions: { delete: true, warn: true, log: true, dm: false }
        };
      }

      return {
        enabled: result.enabled,
        filters: result.filters || {
          profanity: { enabled: true, severity: 'medium', customWords: [] },
          spam: { enabled: true, maxMessages: 5, timeWindow: 10, maxDuplicates: 3 },
          links: { enabled: false, whitelist: [], blockInvites: true },
          caps: { enabled: true, maxPercentage: 70, minLength: 6 },
          mentions: { enabled: true, maxMentions: 5, maxRoleMentions: 2 },
          zalgo: { enabled: true, threshold: 0.5 }
        },
        thresholds: result.thresholds || {
          autoban: { violations: 10, timeWindow: 300 },
          automute: { violations: 5, timeWindow: 300, duration: 600 }
        },
        exemptions: result.exemptions || { roles: [], channels: [], users: [] },
        actions: result.actions || { delete: true, warn: true, log: true, dm: false },
        logChannelId: result.log_channel_id
      };
    } catch (error) {
      logger.error('Error getting automod config:', error);
      throw error;
    }
  }

  private isExempt(message: Message, config: AutomodConfig): boolean {
    const member = message.member;
    if (!member) return false;

    // Safely handle exemptions that might be undefined
    const exemptions = config.exemptions || { users: [], channels: [], roles: [] };

    // Check user exemptions
    if (exemptions.users && exemptions.users.includes(message.author.id)) return true;

    // Check channel exemptions
    if (exemptions.channels && exemptions.channels.includes(message.channel.id)) return true;

    // Check role exemptions
    if (exemptions.roles && member.roles.cache.some(role => exemptions.roles.includes(role.id))) return true;

    // Check permissions (moderators are exempt)
    if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;

    return false;
  }

  private checkProfanity(content: string, config: AutomodConfig['filters']['profanity']): { violation: boolean; words?: string[] } {
    const words = content.toLowerCase().split(/\s+/);
    const violations: string[] = [];

    for (const word of words) {
      // Remove special characters and check
      const cleanWord = word.replace(/[^a-z]/g, '');
      
      if (this.profanityWords.has(cleanWord) || config.customWords.includes(cleanWord)) {
        violations.push(word);
      }

      // Check for character substitution (l33t speak)
      const leet = cleanWord
        .replace(/0/g, 'o')
        .replace(/1/g, 'l')
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/5/g, 's')
        .replace(/7/g, 't');

      if (this.profanityWords.has(leet)) {
        violations.push(word);
      }
    }

    return {
      violation: violations.length > 0,
      words: violations
    };
  }

  private checkSpam(message: Message, config: AutomodConfig['filters']['spam']): { violation: boolean; type?: string } {
    const userId = `${message.author.id}-${message.guild!.id}`;
    const now = Date.now();
    
    if (!this.spamTrackers.has(userId)) {
      this.spamTrackers.set(userId, { messages: [], violations: 0, lastViolation: 0 });
    }

    const tracker = this.spamTrackers.get(userId)!;
    
    // Clean old messages
    tracker.messages = tracker.messages.filter(msg => now - msg.timestamp < config.timeWindow * 1000);
    
    // Add current message
    tracker.messages.push({ content: message.content, timestamp: now });

    // Check message rate
    if (tracker.messages.length > config.maxMessages) {
      return { violation: true, type: 'rate' };
    }

    // Check duplicate messages
    const duplicates = tracker.messages.filter(msg => msg.content === message.content);
    if (duplicates.length > config.maxDuplicates) {
      return { violation: true, type: 'duplicate' };
    }

    return { violation: false };
  }

  private checkLinks(content: string, config: AutomodConfig['filters']['links']): { violation: boolean; links?: string[] } {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)[^\s]+/gi;
    
    const urls = content.match(urlRegex) || [];
    const invites = content.match(inviteRegex) || [];

    // Check invite links
    if (config.blockInvites && invites.length > 0) {
      return { violation: true, links: invites };
    }

    // Check against whitelist
    if (urls.length > 0) {
      const violatingUrls = urls.filter(url => {
        return !config.whitelist.some(domain => url.includes(domain));
      });

      if (violatingUrls.length > 0) {
        return { violation: true, links: violatingUrls };
      }
    }

    return { violation: false };
  }

  private checkCaps(content: string, config: AutomodConfig['filters']['caps']): { violation: boolean; percentage?: number } {
    if (content.length < config.minLength) return { violation: false };

    const caps = content.match(/[A-Z]/g) || [];
    const percentage = (caps.length / content.length) * 100;

    return {
      violation: percentage > config.maxPercentage,
      percentage
    };
  }

  private checkMentions(message: Message, config: AutomodConfig['filters']['mentions']): { violation: boolean; type?: string } {
    const userMentions = message.mentions.users.size;
    const roleMentions = message.mentions.roles.size;

    if (userMentions > config.maxMentions) {
      return { violation: true, type: 'users' };
    }

    if (roleMentions > config.maxRoleMentions) {
      return { violation: true, type: 'roles' };
    }

    return { violation: false };
  }

  private checkZalgo(content: string, config: AutomodConfig['filters']['zalgo']): { violation: boolean; intensity?: number } {
    const zalgoMatches = content.match(this.zalgoRegex) || [];
    const intensity = zalgoMatches.length / content.length;

    return {
      violation: intensity > config.threshold,
      intensity
    };
  }

  private async handleViolations(message: Message, violations: string[], config: AutomodConfig): Promise<void> {
    try {
      // Delete message if configured
      if (config.actions.delete && message.deletable) {
        await message.delete();
      }

      // Log violation
      await this.logViolation(message, violations);

      // Send log to channel
      if (config.actions.log && config.logChannelId) {
        await this.sendLogMessage(message, violations, config.logChannelId);
      }

      // DM user if configured
      if (config.actions.dm) {
        await this.sendDMWarning(message, violations);
      }

      // Check for automatic sanctions
      await this.checkAutoSanctions(message, config);

    } catch (error) {
      logger.error('Error handling automod violations:', error);
    }
  }

  private async logViolation(message: Message, violations: string[]): Promise<void> {
    try {
      await db('automod_violations').insert({
        guild_id: message.guild!.id,
        user_id: message.author.id,
        channel_id: message.channel.id,
        message_id: message.id,
        violation_type: violations[0], // Primary violation
        content: message.content,
        metadata: { violations, timestamp: Date.now() },
        action_taken: 'delete'
      });
    } catch (error) {
      logger.error('Error logging automod violation:', error);
    }
  }

  private async sendLogMessage(message: Message, violations: string[], logChannelId: string): Promise<void> {
    try {
      const channel = message.guild!.channels.cache.get(logChannelId) as TextChannel;
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setTitle('🚨 Automod Violation')
        .setColor(0xff4757)
        .addFields(
          { name: 'User', value: `${message.author} (${message.author.id})`, inline: true },
          { name: 'Channel', value: `${message.channel}`, inline: true },
          { name: 'Violations', value: violations.join(', '), inline: true },
          { name: 'Content', value: message.content.slice(0, 1000) || '*No content*', inline: false }
        )
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`automod_warn_${message.author.id}`)
            .setLabel('Warn User')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`automod_timeout_${message.author.id}`)
            .setLabel('Timeout')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`automod_ignore_${message.author.id}`)
            .setLabel('Ignore')
            .setStyle(ButtonStyle.Primary)
        );

      await channel.send({ embeds: [embed], components: [row] });
    } catch (error) {
      logger.error('Error sending automod log message:', error);
    }
  }

  private async sendDMWarning(message: Message, violations: string[]): Promise<void> {
    try {
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Message Violation')
        .setColor(0xffa502)
        .setDescription(`Your message in **${message.guild!.name}** was removed for violating server rules.`)
        .addFields(
          { name: 'Violations', value: violations.join(', '), inline: true },
          { name: 'Channel', value: `#${(message.channel as TextChannel).name}`, inline: true }
        )
        .setFooter({ text: 'Please review the server rules to avoid future violations.' });

      await message.author.send({ embeds: [embed] });
    } catch (error) {
      // User might have DMs disabled, ignore error
      logger.debug('Could not send DM warning to user:', error);
    }
  }

  private async checkAutoSanctions(message: Message, config: AutomodConfig): Promise<void> {
    try {
      const userId = message.author.id;
      const guildId = message.guild!.id;
      const now = Date.now();

      // Get recent violations
      const recentViolations = await db('automod_violations')
        .where('guild_id', guildId)
        .where('user_id', userId)
        .where('created_at', '>', new Date(now - config.thresholds.automute.timeWindow * 1000))
        .count('* as count')
        .first();

      const violationCount = parseInt(recentViolations?.count as string) || 0;

      // Check for auto-mute
      if (violationCount >= config.thresholds.automute.violations) {
        const member = message.member;
        if (member && member.moderatable) {
          await member.timeout(config.thresholds.automute.duration * 1000, 'Automod: Multiple violations');
          logger.info(`Auto-muted user ${userId} in guild ${guildId} for ${violationCount} violations`);
        }
      }

      // Check for auto-ban
      if (violationCount >= config.thresholds.autoban.violations) {
        const member = message.member;
        if (member && member.bannable) {
          await member.ban({ reason: 'Automod: Excessive violations' });
          logger.info(`Auto-banned user ${userId} in guild ${guildId} for ${violationCount} violations`);
        }
      }
    } catch (error) {
      logger.error('Error checking auto sanctions:', error);
    }
  }

  async configureGuild(guildId: string, config: Partial<AutomodConfig>): Promise<void> {
    try {
      await db('automod_config')
        .insert({
          guild_id: guildId,
          enabled: config.enabled,
          filters: config.filters,
          thresholds: config.thresholds,
          exemptions: config.exemptions,
          actions: config.actions,
          log_channel_id: config.logChannelId
        })
        .onConflict('guild_id')
        .merge();

      logger.info(`Updated automod config for guild ${guildId}`);
    } catch (error) {
      logger.error('Error updating automod config:', error);
      throw error;
    }
  }

  async enableAutomod(guildId: string): Promise<void> {
    try {
      const defaultConfig = {
        enabled: true,
        filters: {
          profanity: { enabled: true, severity: 'medium', customWords: [] },
          spam: { enabled: true, maxMessages: 5, timeWindow: 10, maxDuplicates: 3 },
          links: { enabled: false, whitelist: [], blockInvites: true },
          caps: { enabled: true, maxPercentage: 70, minLength: 6 },
          mentions: { enabled: true, maxMentions: 5, maxRoleMentions: 2 },
          zalgo: { enabled: true, threshold: 0.5 }
        },
        thresholds: {
          autoban: { violations: 10, timeWindow: 300 },
          automute: { violations: 5, timeWindow: 300, duration: 600 }
        },
        exemptions: { roles: [], channels: [], users: [] },
        actions: { delete: true, warn: true, log: true, dm: false }
      };

      await db('automod_config')
        .insert({
          guild_id: guildId,
          enabled: true,
          filters: defaultConfig.filters,
          thresholds: defaultConfig.thresholds,
          exemptions: defaultConfig.exemptions,
          actions: defaultConfig.actions
        })
        .onConflict('guild_id')
        .merge();

      logger.info(`Enabled automod for guild ${guildId}`);
    } catch (error) {
      logger.error('Error enabling automod:', error);
      throw error;
    }
  }

  async disableAutomod(guildId: string): Promise<void> {
    try {
      await db('automod_config')
        .where('guild_id', guildId)
        .update({ enabled: false });

      logger.info(`Disabled automod for guild ${guildId}`);
    } catch (error) {
      logger.error('Error disabling automod:', error);
      throw error;
    }
  }

  async getConfig(guildId: string): Promise<any> {
    try {
      const result = await db('automod_config')
        .where('guild_id', guildId)
        .first();

      return result || { enabled: false, filters: {}, exemptions: {}, actions: {} };
    } catch (error) {
      logger.error('Error getting automod config:', error);
      throw error;
    }
  }

  async updateFilter(guildId: string, filterType: string, enabled: boolean): Promise<void> {
    try {
      // Get current config
      const config = await this.getGuildConfig(guildId);
      
      // Update the specific filter
      if (config.filters[filterType as keyof typeof config.filters]) {
        config.filters[filterType as keyof typeof config.filters].enabled = enabled;
      }

      // Save back to database
      await db('automod_config')
        .where('guild_id', guildId)
        .update({ filters: config.filters });
      logger.info(`Updated ${filterType} filter to ${enabled} for guild ${guildId}`);
    } catch (error) {
      logger.error('Error updating filter:', error);
      throw error;
    }
  }

  async setLogChannel(guildId: string, channelId: string): Promise<void> {
    try {
      await db('automod_config')
        .where('guild_id', guildId)
        .update({ log_channel_id: channelId });

      logger.info(`Set log channel to ${channelId} for guild ${guildId}`);
    } catch (error) {
      logger.error('Error setting log channel:', error);
      throw error;
    }
  }

  async updateExemption(guildId: string, exemptType: string, targetId: string, isAdd: boolean): Promise<void> {
    try {
      const config = await this.getGuildConfig(guildId);
      
      const exemptionArray = config.exemptions[exemptType as keyof typeof config.exemptions] as string[];
      
      if (isAdd) {
        if (!exemptionArray.includes(targetId)) {
          exemptionArray.push(targetId);
        }
      } else {
        const index = exemptionArray.indexOf(targetId);
        if (index > -1) {
          exemptionArray.splice(index, 1);
        }
      }

      await db('automod_config')
        .where('guild_id', guildId)
        .update({ exemptions: config.exemptions });
      logger.info(`${isAdd ? 'Added' : 'Removed'} ${exemptType} exemption ${targetId} for guild ${guildId}`);
    } catch (error) {
      logger.error('Error updating exemption:', error);
      throw error;
    }
  }
}