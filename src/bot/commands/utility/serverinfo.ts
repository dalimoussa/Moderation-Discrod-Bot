import { SlashCommandBuilder, EmbedBuilder, GuildPremiumTier } from 'discord.js';
import { Command } from '../../interfaces/command';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Shows information about this server'),

  guildOnly: true,
  cooldown: 5,

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: 'This can only be used in a server.', ephemeral: true });
      return;
    }

    const g = interaction.guild;
    const owner = await g.fetchOwner().catch(() => null);
    const roles = g.roles.cache.size;
    const channels = g.channels.cache.size;
    const emojis = g.emojis.cache.size;
    const boost = g.premiumTier ?? GuildPremiumTier.None;

    const embed = new EmbedBuilder()
      .setTitle(`Server Info — ${g.name}`)
      .setThumbnail(g.iconURL() ?? null)
      .setColor(0x805ad5)
      .addFields(
        { name: 'Owner', value: owner ? `${owner.user.tag}` : 'Unknown', inline: true },
        { name: 'Members', value: `${g.memberCount}`, inline: true },
        { name: 'Roles', value: `${roles}`, inline: true },
        { name: 'Channels', value: `${channels}`, inline: true },
        { name: 'Emojis', value: `${emojis}`, inline: true },
        { name: 'Boost Tier', value: `${boost}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp/1000)}:R>`, inline: true },
        { name: 'ID', value: g.id, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
} satisfies Command;
