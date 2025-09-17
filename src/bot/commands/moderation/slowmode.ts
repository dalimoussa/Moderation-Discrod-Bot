import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, TextChannel, MessageFlags } from 'discord.js';
import { Command } from '../../interfaces/command';

export default {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for the current text channel')
    .addIntegerOption(o => o.setName('seconds').setDescription('0-21600').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false) as SlashCommandBuilder,

  guildOnly: true,
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild() || !interaction.channel) { await interaction.reply({ content: 'Use in a server text channel.', flags: MessageFlags.Ephemeral }); return; }
    const seconds = interaction.options.getInteger('seconds', true);
    if (seconds < 0 || seconds > 21600) { await interaction.reply({ content: 'Seconds must be between 0 and 21600.', flags: MessageFlags.Ephemeral }); return; }
    const channel = interaction.channel as TextChannel;
    await channel.setRateLimitPerUser(seconds, `${interaction.user.tag} via /slowmode`);
    await interaction.reply({ content: `🐌 Slowmode set to ${seconds}s.` });
  }
} satisfies Command;
