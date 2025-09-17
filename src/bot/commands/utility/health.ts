import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Command } from '../../interfaces/command';
import { BotClient } from '../../client';

export default {
  data: new SlashCommandBuilder()
    .setName('health')
    .setDescription('Run a quick health check (DB, Redis, latency)') as SlashCommandBuilder,

  cooldown: 10,

  async execute(interaction) {
    const client = interaction.client as unknown as BotClient;
  await interaction.reply({ content: 'Running health checks…', flags: MessageFlags.Ephemeral });

    const start = Date.now();
    const apiLatency = Math.round(interaction.client.ws.ping);

    const dbOk = await client.database.healthCheck();
    const redisOk = await client.redis.healthCheck();
    const rtt = Date.now() - start;

    const embed = new EmbedBuilder()
      .setTitle('Health Check')
      .setColor(dbOk && redisOk ? 0x48bb78 : 0xf6ad55)
      .addFields(
        { name: 'Database', value: dbOk ? '🟢 OK' : '🔴 FAIL', inline: true },
        { name: 'Redis', value: redisOk ? '🟢 OK' : '🔴 FAIL', inline: true },
        { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
        { name: 'Roundtrip', value: `${rtt}ms`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
  }
} satisfies Command;
