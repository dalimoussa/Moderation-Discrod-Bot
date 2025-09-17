import { SlashCommandBuilder, EmbedBuilder, OAuth2Scopes, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../interfaces/command';

export default {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the bot invite link with recommended permissions'),

  cooldown: 5,

  async execute(interaction) {
    const url = interaction.client.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.ManageMessages
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('Invite Aegis')
      .setDescription(`[Click here to invite the bot](${url})`)
      .setColor(0x38a169);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
} satisfies Command;
