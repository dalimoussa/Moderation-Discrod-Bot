import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildMember, MessageFlags } from 'discord.js';
import { Command } from '../../interfaces/command';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(o => o.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false).setMaxLength(500))
    .addIntegerOption(o => o.setName('delete_days').setDescription('Delete previous messages (0-7 days)').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  guildOnly: true,
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) { await interaction.reply({ content: 'Guild only.', flags: MessageFlags.Ephemeral }); return; }
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const del = interaction.options.getInteger('delete_days') ?? 0;
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);

    const me = interaction.guild!.members.me!;
    if (member) {
      if (!member.bannable || me.roles.highest.position <= member.roles.highest.position) {
        await interaction.reply({ content: 'I cannot ban this member due to role hierarchy.', flags: MessageFlags.Ephemeral });
        return;
      }
      const executor = interaction.member as GuildMember;
      if (executor.roles.highest.position <= member.roles.highest.position && interaction.user.id !== interaction.guild!.ownerId) {
        await interaction.reply({ content: 'You cannot ban someone with equal or higher roles.', flags: MessageFlags.Ephemeral });
        return;
      }
    }

    await interaction.guild!.members.ban(user.id, { reason, deleteMessageSeconds: del * 24 * 3600 });
    await interaction.reply({ content: `🔨 Banned ${user.tag}. Reason: ${reason}` });
  }
} satisfies Command;
