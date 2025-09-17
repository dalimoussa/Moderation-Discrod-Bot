import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../interfaces/command';

function bytesToMb(bytes: number) { return (bytes / 1024 / 1024).toFixed(1); }

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Bot statistics (guilds, users, memory, uptime)') as SlashCommandBuilder,

  cooldown: 5,

  async execute(interaction) {
    const mem = process.memoryUsage();
    const guilds = interaction.client.guilds.cache;
    const users = interaction.client.users.cache;
    const channels = interaction.client.channels.cache;

    const embed = new EmbedBuilder()
      .setTitle('Aegis Stats')
      .setColor(0x3182ce)
      .addFields(
        { name: 'Servers', value: `${guilds.size}`, inline: true },
        { name: 'Cached Users', value: `${users.size}`, inline: true },
        { name: 'Cached Channels', value: `${channels.size}`, inline: true },
        { name: 'Uptime', value: `${Math.floor(process.uptime())}s`, inline: true },
        { name: 'RSS', value: `${bytesToMb(mem.rss)} MB`, inline: true },
        { name: 'Heap Used', value: `${bytesToMb(mem.heapUsed)} MB`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
} satisfies Command;
