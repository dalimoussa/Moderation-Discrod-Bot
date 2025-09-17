import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../interfaces/command';
import os from 'os';

function formatUptime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [] as string[];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export default {
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('About the bot: version, uptime, system info'),

  cooldown: 5,

  async execute(interaction) {
    const pkg = require('../../../../package.json');
    const memory = process.memoryUsage();
    const heapUsedMb = (memory.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotalMb = (memory.heapTotal / 1024 / 1024).toFixed(1);

    const embed = new EmbedBuilder()
      .setTitle('About Aegis')
      .setColor(0x2b6cb0)
      .addFields(
        { name: 'Version', value: `v${pkg.version || '1.0.0'}`, inline: true },
        { name: 'Node', value: process.version, inline: true },
        { name: 'Platform', value: `${os.type()} ${os.release()}`, inline: true },
        { name: 'Uptime', value: formatUptime(process.uptime() * 1000), inline: true },
        { name: 'Memory', value: `${heapUsedMb} / ${heapTotalMb} MB`, inline: true },
        { name: 'Servers', value: `${interaction.client.guilds.cache.size}`, inline: true },
      )
      .setFooter({ text: 'Aegis — professional Discord bot' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
} satisfies Command;
