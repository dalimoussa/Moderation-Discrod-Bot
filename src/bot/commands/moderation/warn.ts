import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits,
  EmbedBuilder,
  User,
  GuildMember
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { logger, logModeration } from '@/shared/utils/logger';

export const warn: Command = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)
        .setMaxLength(500))
    .addBooleanOption(option =>
      option.setName('silent')
        .setDescription('Whether to send the warning silently (no DM to user)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true
      });
      return;
    }

    if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: 'I need the "Moderate Members" permission to issue warnings.',
        ephemeral: true
      });
      return;
    }

    try {
      const targetUser = interaction.options.getUser('user', true) as User;
      const reason = interaction.options.getString('reason', true);
      const silent = interaction.options.getBoolean('silent') ?? false;

      // Check if user is trying to warn themselves
      if (targetUser.id === interaction.user.id) {
        await interaction.reply({
          content: 'You cannot warn yourself.',
          ephemeral: true
        });
        return;
      }

      // Check if user is trying to warn a bot
      if (targetUser.bot) {
        await interaction.reply({
          content: 'You cannot warn a bot.',
          ephemeral: true
        });
        return;
      }

      // Check if target is in the guild
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        await interaction.reply({
          content: 'User is not in this server.',
          ephemeral: true
        });
        return;
      }

      // Check role hierarchy
      const memberRoles = interaction.member.roles as GuildMember['roles'];
      if (memberRoles.highest.position <= targetMember.roles.highest.position && 
          interaction.user.id !== interaction.guild.ownerId) {
        await interaction.reply({
          content: 'You cannot warn someone with equal or higher roles.',
          ephemeral: true
        });
        return;
      }

      // Send warning to user (if not silent)
      if (!silent) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('⚠️ Warning Received')
            .setColor(0xffaa00)
            .addFields(
              { name: 'Server', value: interaction.guild.name, inline: true },
              { name: 'Moderator', value: interaction.user.tag, inline: true },
              { name: 'Reason', value: reason }
            )
            .setTimestamp();

          await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
          // User has DMs disabled
          logger.warn(`Failed to send DM to user ${targetUser.tag}: ${error}`);
        }
      }

      // Log the moderation action
      logModeration('warn', targetUser.id, interaction.user.id, interaction.guild.id, reason);

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setTitle('⚠️ Warning Issued')
        .setColor(0x00ff00)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Silent', value: silent ? 'Yes' : 'No', inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed] });

    } catch (error) {
      logger.error('Error in warn command:', error);
      await interaction.reply({
        content: 'An error occurred while processing the warning.',
        ephemeral: true
      });
    }
  }
};

export default warn;