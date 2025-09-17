import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel, MessageFlags } from 'discord.js';
import { Command } from '../../interfaces/command';

export default {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages in the current channel')
    .addIntegerOption(o => o.setName('count').setDescription('How many (2-100)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false) as SlashCommandBuilder,

  guildOnly: true,
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild() || !interaction.channel) {
      await interaction.reply({ content: 'Use this in a server text channel.', flags: MessageFlags.Ephemeral });
      return;
    }
    const count = interaction.options.getInteger('count', true);
    if (count < 2 || count > 100) {
      await interaction.reply({ content: 'Count must be between 2 and 100.', flags: MessageFlags.Ephemeral });
      return;
    }
    const channel = interaction.channel as TextChannel;
    const deleted = await channel.bulkDelete(count, true).catch(() => null);
    if (!deleted) {
      await interaction.reply({ content: 'Failed to delete messages (older than 14 days cannot be deleted).', flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ content: `🧹 Deleted ${deleted.size} messages.`, ephemeral: true });
  }
} satisfies Command;
