import {
  Message,
  VoiceState
} from 'discord.js';
import { logger } from '@/shared/utils/logger';
import knex from 'knex';

// Use compiled CommonJS knex configuration
const config = require('../../../knexfile.js');
const environment = process.env.NODE_ENV || 'development';
const knexConfig = (config as any)[environment];
const db = knex(knexConfig);

interface UserLevel {
  guildId: string;
  userId: string;
  xp: number;
  totalXp: number;
  level: number;
  totalMessages: number;
  voiceTime: number;
  lastMessageAt: Date | null;
  lastVoiceAt: Date | null;
  achievements: string[];
}

interface LevelReward {
  id: number;
  guildId: string;
  level: number;
  rewardType: 'role' | 'currency' | 'badge';
  rewardValue: string;
  description?: string;
}

export class LevelingService {
  private xpCooldowns = new Map<string, number>();
  private voiceTracking = new Map<string, number>(); // Track voice join times

  async processMessage(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;

    const userId = message.author.id;
    const guildId = message.guild.id;
    const cooldownKey = `${guildId}-${userId}`;

    // Check XP cooldown (prevent spam)
    const now = Date.now();
    const lastXp = this.xpCooldowns.get(cooldownKey) || 0;
    if (now - lastXp < 60000) return; // 1 minute cooldown

    this.xpCooldowns.set(cooldownKey, now);

    try {
      // Calculate XP gain (10-25 XP per message)
      const baseXp = Math.floor(Math.random() * 16) + 10;
      const bonusXp = await this.calculateBonusXp(message);
      const totalXp = baseXp + bonusXp;

      await this.addXp(guildId, userId, totalXp, 'message');
    } catch (error) {
      logger.error('Error processing message XP:', error);
    }
  }

  async processVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const userId = oldState.member?.id || newState.member?.id;
    const guildId = oldState.guild.id;
    
    if (!userId || !guildId) return;

    const trackingKey = `${guildId}-${userId}`;
    const now = Date.now();

    // User joined a voice channel
    if (!oldState.channel && newState.channel && !newState.deaf && !newState.mute) {
      this.voiceTracking.set(trackingKey, now);
    }
    
    // User left voice channel or became deaf/muted
    else if ((oldState.channel && !newState.channel) || newState.deaf || newState.mute) {
      const joinTime = this.voiceTracking.get(trackingKey);
      if (joinTime) {
        const timeSpent = Math.floor((now - joinTime) / 1000); // seconds
        
        if (timeSpent >= 60) { // Minimum 1 minute for XP
          const xpGain = Math.floor(timeSpent / 60) * 2; // 2 XP per minute
          await this.addXp(guildId, userId, xpGain, 'voice');
          
          // Update voice time in database
          await this.updateVoiceTime(guildId, userId, timeSpent);
        }
        
        this.voiceTracking.delete(trackingKey);
      }
    }
  }

  async addXp(guildId: string, userId: string, amount: number, source: 'message' | 'voice' | 'bonus'): Promise<{ leveledUp: boolean; newLevel?: number; oldLevel?: number }> {
    try {
      const userLevel = await this.getUserLevel(guildId, userId);
      const newXp = userLevel.xp + amount;
      const newLevel = this.calculateLevel(newXp);
      const leveledUp = newLevel > userLevel.level;

      // Update database
      await db('user_levels')
        .insert({
          guild_id: guildId,
          user_id: userId,
          xp: newXp,
          total_xp: newXp,
          level: newLevel,
          message_count: source === 'message' ? userLevel.totalMessages + 1 : userLevel.totalMessages,
          voice_time: userLevel.voiceTime,
          last_message_at: new Date(),
          achievements: userLevel.achievements || []
        })
        .onConflict(['guild_id', 'user_id'])
        .merge();

      // Handle level up
      if (leveledUp) {
        await this.handleLevelUp(guildId, userId, userLevel.level, newLevel);
      }

      const result: { leveledUp: boolean; newLevel?: number; oldLevel?: number } = { leveledUp };
      
      if (leveledUp) {
        result.newLevel = newLevel;
        result.oldLevel = userLevel.level;
      }

      return result;
    } catch (error) {
      logger.error('Error adding XP:', error);
      return { leveledUp: false };
    }
  }

  async getUserLevel(guildId: string, userId: string): Promise<UserLevel> {
    try {
      const result = await db('user_levels')
        .where('guild_id', guildId)
        .where('user_id', userId)
        .first();

      if (!result) {
        return {
          guildId,
          userId,
          xp: 0,
          totalXp: 0,
          level: 0,
          totalMessages: 0,
          voiceTime: 0,
          lastMessageAt: null,
          lastVoiceAt: null,
          achievements: []
        };
      }

      return {
        guildId: result.guild_id,
        userId: result.user_id,
        xp: parseInt(result.xp),
        totalXp: parseInt(result.total_xp),
        level: result.level,
        totalMessages: parseInt(result.message_count),
        voiceTime: parseInt(result.voice_time),
        lastMessageAt: result.last_message_at ? new Date(result.last_message_at) : null,
        lastVoiceAt: result.last_voice_at ? new Date(result.last_voice_at) : null,
        achievements: result.achievements || []
      };
    } catch (error) {
      logger.error('Error getting user level:', error);
      throw error;
    }
  }

  async getLeaderboard(guildId: string, limit: number = 10): Promise<UserLevel[]> {
    try {
      const results = await db('user_levels')
        .where('guild_id', guildId)
        .orderBy('xp', 'desc')
        .limit(limit);

      return results.map(result => ({
        guildId: result.guild_id,
        userId: result.user_id,
        xp: parseInt(result.xp),
        totalXp: parseInt(result.total_xp),
        level: result.level,
        totalMessages: parseInt(result.message_count),
        voiceTime: parseInt(result.voice_time),
        lastMessageAt: result.last_message_at ? new Date(result.last_message_at) : null,
        lastVoiceAt: result.last_voice_at ? new Date(result.last_voice_at) : null,
        achievements: result.achievements || []
      }));
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      return [];
    }
  }

  async addLevelReward(guildId: string, level: number, type: LevelReward['rewardType'], value: string, description?: string): Promise<void> {
    try {
      await db('level_rewards').insert({
        guild_id: guildId,
        level,
        reward_type: type,
        reward_value: value,
        description
      });

      logger.info(`Added level reward for guild ${guildId}, level ${level}: ${type} - ${value}`);
    } catch (error) {
      logger.error('Error adding level reward:', error);
      throw error;
    }
  }

  async getLevelRewards(guildId: string, level?: number): Promise<LevelReward[]> {
    try {
      let query = db('level_rewards').where('guild_id', guildId);
      
      if (level !== undefined) {
        query = query.where('level', level);
      }

      const results = await query.orderBy('level', 'asc');

      return results.map(result => ({
        id: result.id,
        guildId: result.guild_id,
        level: result.level,
        rewardType: result.reward_type,
        rewardValue: result.reward_value,
        description: result.description
      }));
    } catch (error) {
      logger.error('Error getting level rewards:', error);
      return [];
    }
  }

  private calculateLevel(xp: number): number {
    // Standard leveling formula: level = floor(sqrt(xp / 100))
    // This means: Level 1 = 100 XP, Level 2 = 400 XP, Level 3 = 900 XP, etc.
    return Math.floor(Math.sqrt(xp / 100));
  }

  private async calculateBonusXp(message: Message): Promise<number> {
    let bonus = 0;

    // Weekend bonus (2x XP)
    const now = new Date();
    if (now.getDay() === 0 || now.getDay() === 6) {
      bonus += 10;
    }

    // Active chat bonus (if multiple people chatting)
    const recentMessages = await message.channel.messages.fetch({ limit: 10 });
    const uniqueAuthors = new Set(recentMessages.map(m => m.author.id));
    if (uniqueAuthors.size >= 3) {
      bonus += 5;
    }

    // Length bonus for longer messages
    if (message.content.length > 100) {
      bonus += 3;
    }

    return bonus;
  }

  private async handleLevelUp(guildId: string, userId: string, oldLevel: number, newLevel: number): Promise<void> {
    try {
      // Get level rewards for the new level
      const rewards = await this.getLevelRewards(guildId, newLevel);

      // Send level up notification
      // Note: In a real implementation, you'd want to send this to a specific channel or DM
      logger.info(`User ${userId} leveled up from ${oldLevel} to ${newLevel} in guild ${guildId}`);

      // Apply rewards
      for (const reward of rewards) {
        await this.applyReward(guildId, userId, reward);
      }

      // Check for achievements
      await this.checkAchievements(guildId, userId, newLevel);
    } catch (error) {
      logger.error('Error handling level up:', error);
    }
  }

  private async applyReward(guildId: string, userId: string, reward: LevelReward): Promise<void> {
    try {
      switch (reward.rewardType) {
        case 'role':
          // Apply role reward
          logger.info(`Applying role reward ${reward.rewardValue} to user ${userId}`);
          break;
        case 'currency':
          // Apply coin reward (would integrate with economy system)
          logger.info(`Applying coin reward ${reward.rewardValue} to user ${userId}`);
          break;
        case 'badge':
          // Apply badge/achievement
          await this.addAchievement(guildId, userId, reward.rewardValue);
          break;
      }
    } catch (error) {
      logger.error('Error applying reward:', error);
    }
  }

  private async addAchievement(guildId: string, userId: string, achievement: string): Promise<void> {
    try {
      const userLevel = await this.getUserLevel(guildId, userId);
      
      if (!userLevel.achievements.includes(achievement)) {
        const newAchievements = [...userLevel.achievements, achievement];
        
        await db('user_levels')
          .where('guild_id', guildId)
          .where('user_id', userId)
          .update({
            achievements: JSON.stringify(newAchievements)
          });

        logger.info(`Added achievement ${achievement} to user ${userId}`);
      }
    } catch (error) {
      logger.error('Error adding achievement:', error);
    }
  }

  private async checkAchievements(guildId: string, userId: string, level: number): Promise<void> {
    try {
      const userLevel = await this.getUserLevel(guildId, userId);
      const achievements: string[] = [];

      // Level milestones
      if (level >= 10 && !userLevel.achievements.includes('veteran')) {
        achievements.push('veteran');
      }
      if (level >= 25 && !userLevel.achievements.includes('expert')) {
        achievements.push('expert');
      }
      if (level >= 50 && !userLevel.achievements.includes('legend')) {
        achievements.push('legend');
      }

      // Message milestones
      if (userLevel.totalMessages >= 1000 && !userLevel.achievements.includes('chatterbox')) {
        achievements.push('chatterbox');
      }
      if (userLevel.totalMessages >= 10000 && !userLevel.achievements.includes('socialite')) {
        achievements.push('socialite');
      }

      // Voice time milestones (in hours)
      const voiceHours = userLevel.voiceTime / 3600;
      if (voiceHours >= 100 && !userLevel.achievements.includes('voice_active')) {
        achievements.push('voice_active');
      }

      // Apply new achievements
      for (const achievement of achievements) {
        await this.addAchievement(guildId, userId, achievement);
      }
    } catch (error) {
      logger.error('Error checking achievements:', error);
    }
  }

  private async updateVoiceTime(guildId: string, userId: string, timeSpent: number): Promise<void> {
    try {
      await db('user_levels')
        .where('guild_id', guildId)
        .where('user_id', userId)
        .increment('voice_time', timeSpent);
    } catch (error) {
      logger.error('Error updating voice time:', error);
    }
  }
}