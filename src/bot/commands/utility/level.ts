import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
  User
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { LevelingService } from '@/shared/services/leveling';

const levelingService = new LevelingService();

export default {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Leveling system commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check your or someone else\'s level')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to check (defaults to yourself)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('Show the server leaderboard')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of users to show (max 25)')
            .setMinValue(5)
            .setMaxValue(25)
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('rewards')
        .setDescription('View level rewards'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add-reward')
        .setDescription('Add a level reward (Admin only)')
        .addIntegerOption(option =>
          option.setName('level')
            .setDescription('Level to unlock reward')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true))
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of reward')
            .setRequired(true)
            .addChoices(
              { name: 'Role', value: 'role' },
              { name: 'Currency', value: 'currency' },
              { name: 'Badge', value: 'badge' }
            ))
        .addStringOption(option =>
          option.setName('value')
            .setDescription('Reward value (role ID, coin amount, badge name, etc.)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Description of the reward')
            .setRequired(false)))
    .setDMPermission(false) as SlashCommandBuilder,

  guildOnly: true,
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'check':
          await handleCheck(interaction);
          break;
        case 'leaderboard':
          await handleLeaderboard(interaction);
          break;
        case 'rewards':
          await handleRewards(interaction);
          break;
        case 'add-reward':
          await handleAddReward(interaction);
          break;
        default:
          await interaction.reply({
            content: '❌ Unknown subcommand.',
            flags: MessageFlags.Ephemeral
          });
      }
    } catch (error) {
      console.error('Error in level command:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while executing the command.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
} satisfies Command;

async function handleCheck(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const userLevel = await levelingService.getUserLevel(interaction.guild!.id, targetUser.id);

  // Calculate XP needed for next level
  const currentLevelXp = userLevel.level * userLevel.level * 100;
  const nextLevelXp = (userLevel.level + 1) * (userLevel.level + 1) * 100;
  const xpNeeded = nextLevelXp - userLevel.xp;
  const xpProgress = userLevel.xp - currentLevelXp;
  const xpForNextLevel = nextLevelXp - currentLevelXp;

  // Create progress bar
  const progressBarLength = 20;
  const filledBars = Math.floor((xpProgress / xpForNextLevel) * progressBarLength);
  const progressBar = '█'.repeat(filledBars) + '░'.repeat(progressBarLength - filledBars);

  // Format voice time
  const voiceHours = Math.floor(userLevel.voiceTime / 3600);
  const voiceMinutes = Math.floor((userLevel.voiceTime % 3600) / 60);

  const embed = new EmbedBuilder()
    .setTitle(`📊 Level Stats for ${targetUser.displayName}`)
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      { name: '🎯 Level', value: userLevel.level.toString(), inline: true },
      { name: '⭐ Total XP', value: userLevel.xp.toLocaleString(), inline: true },
      { name: '📈 XP to Next Level', value: xpNeeded.toLocaleString(), inline: true },
      { name: '📝 Messages Sent', value: userLevel.totalMessages.toLocaleString(), inline: true },
      { name: '🎤 Voice Time', value: `${voiceHours}h ${voiceMinutes}m`, inline: true },
      { name: '🏆 Achievements', value: userLevel.achievements.length.toString(), inline: true },
      { name: '📊 Progress to Next Level', value: `${progressBar}\n${xpProgress.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`, inline: false }
    )
    .setColor(0x3498db);

  if (userLevel.achievements.length > 0) {
    const achievementEmojis: Record<string, string> = {
      veteran: '🎖️',
      expert: '👑',
      legend: '⭐',
      chatterbox: '💬',
      socialite: '🗣️',
      voice_active: '🎤'
    };

    const achievementList = userLevel.achievements
      .map(achievement => `${achievementEmojis[achievement] || '🏅'} ${achievement}`)
      .join(', ');

    embed.addFields({ name: '🏆 Achievements Unlocked', value: achievementList, inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction) {
  const limit = interaction.options.getInteger('limit') || 10;
  const leaderboard = await levelingService.getLeaderboard(interaction.guild!.id, limit);

  if (leaderboard.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Server Leaderboard')
      .setDescription('No users found with XP yet!')
      .setColor(0x95a5a6);

    await interaction.reply({ embeds: [embed] });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏆 Server Leaderboard')
    .setColor(0xf39c12);

  const leaderboardText = await Promise.all(
    leaderboard.map(async (userLevel, index) => {
      let user: User | undefined;
      try {
        user = await interaction.client.users.fetch(userLevel.userId);
      } catch {
        user = undefined;
      }

      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const username = user?.displayName || 'Unknown User';
      
      return `${medal} **${username}** - Level ${userLevel.level} (${userLevel.xp.toLocaleString()} XP)`;
    })
  );

  embed.setDescription(leaderboardText.join('\n'));

  await interaction.reply({ embeds: [embed] });
}

async function handleRewards(interaction: ChatInputCommandInteraction) {
  const rewards = await levelingService.getLevelRewards(interaction.guild!.id);

  if (rewards.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('🎁 Level Rewards')
      .setDescription('No level rewards have been configured for this server.')
      .setColor(0x95a5a6);

    await interaction.reply({ embeds: [embed] });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎁 Level Rewards')
    .setColor(0x9b59b6);

  // Group rewards by level
  const rewardsByLevel: Record<number, typeof rewards> = {};
  rewards.forEach(reward => {
    if (!rewardsByLevel[reward.level]) {
      rewardsByLevel[reward.level] = [];
    }
    rewardsByLevel[reward.level].push(reward);
  });

  // Create fields for each level
  Object.entries(rewardsByLevel)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([level, levelRewards]) => {
      const rewardText = levelRewards.map(reward => {
        const typeEmojis: Record<string, string> = {
          role: '👑',
          coins: '💰',
          badge: '🏅',
          custom: '🎁'
        };

        const emoji = typeEmojis[reward.rewardType] || '🎁';
        const description = reward.description ? ` - ${reward.description}` : '';
        
        return `${emoji} ${reward.rewardType}: ${reward.rewardValue}${description}`;
      }).join('\n');

      embed.addFields({ name: `Level ${level}`, value: rewardText, inline: false });
    });

  await interaction.reply({ embeds: [embed] });
}

async function handleAddReward(interaction: ChatInputCommandInteraction) {
  // Check permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: '❌ You need the "Manage Server" permission to add level rewards.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const level = interaction.options.getInteger('level', true);
  const type = interaction.options.getString('type', true) as 'role' | 'currency' | 'badge';
  const value = interaction.options.getString('value', true);
  const description = interaction.options.getString('description') || undefined;

  try {
    await levelingService.addLevelReward(interaction.guild!.id, level, type, value, description);

    const embed = new EmbedBuilder()
      .setTitle('✅ Level Reward Added')
      .setDescription(`Added reward for level ${level}`)
      .addFields(
        { name: 'Type', value: type, inline: true },
        { name: 'Value', value: value, inline: true },
        { name: 'Level', value: level.toString(), inline: true }
      )
      .setColor(0x2ecc71);

    if (description) {
      embed.addFields({ name: 'Description', value: description, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error adding level reward:', error);
    await interaction.reply({
      content: '❌ Failed to add level reward. Please try again.',
      flags: MessageFlags.Ephemeral
    });
  }
}