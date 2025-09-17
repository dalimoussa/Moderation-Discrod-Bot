import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember, MessageFlags } from 'discord.js';
import { Command } from '../../interfaces/command';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false).setMaxLength(500))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  guildOnly: true,
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) { await interaction.reply({ content: 'Guild only.', flags: MessageFlags.Ephemeral }); return; }
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (!member) { await interaction.reply({ content: 'User not found in this server.', flags: MessageFlags.Ephemeral }); return; }

    const me = interaction.guild!.members.me!;
    if (!member.kickable || me.roles.highest.position <= member.roles.highest.position) {
      await interaction.reply({ content: 'I cannot kick this member due to role hierarchy.', flags: MessageFlags.Ephemeral });
      return;
    }

    const executor = interaction.member as GuildMember;
    if (executor.roles.highest.position <= member.roles.highest.position && interaction.user.id !== interaction.guild!.ownerId) {
      await interaction.reply({ content: 'You cannot kick someone with equal or higher roles.', flags: MessageFlags.Ephemeral });
      return;
    }

    await member.kick(reason);
    await interaction.reply({ content: `👢 Kicked ${user.tag}. Reason: ${reason}` });
  }
} satisfies Command;
