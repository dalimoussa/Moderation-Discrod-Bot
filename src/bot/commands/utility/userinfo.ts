import { SlashCommandBuilder, EmbedBuilder, User } from 'discord.js';
import { Command } from '../../interfaces/command';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Shows information about a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to inspect').setRequired(false)) as SlashCommandBuilder,

  cooldown: 5,

  async execute(interaction) {
    const user = (interaction.options.getUser('user') ?? interaction.user) as User;
    const member = interaction.inCachedGuild() ? await interaction.guild!.members.fetch(user.id).catch(() => null) : null;

    const embed = new EmbedBuilder()
      .setTitle(`User Info — ${user.tag}`)
      .setThumbnail(user.displayAvatarURL())
      .setColor(0x319795)
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp/1000)}:R>`, inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
      );

    if (member) {
      embed.addFields(
        { name: 'Joined', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp/1000)}:R>` : 'Unknown', inline: true },
        { name: 'Nickname', value: member.nickname || 'None', inline: true },
        { name: 'Roles', value: member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.toString()).slice(0, 10).join(' ') || 'None' }
      );
    }

    await interaction.reply({ embeds: [embed] });
  }
} satisfies Command;
