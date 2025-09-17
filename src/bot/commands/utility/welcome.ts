import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { logger } from '@/shared/utils/logger';
import knex from 'knex';
// Use compiled CommonJS knex configuration to avoid TS rootDir issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('../../../../knexfile.js');

const environment = process.env.NODE_ENV || 'development';
const knexConfig = (config as any)[environment];
const db = knex(knexConfig);

export const welcome: Command = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome messages for new members')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set up welcome system')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel to send welcome messages')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Welcome message (use {user}, {username}, {server}, {memberCount})')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to give new members')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable welcome messages')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable welcome messages')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('test')
        .setDescription('Test the welcome message with your user'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Show current welcome configuration'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'setup':
          await handleSetup(interaction);
          break;
        case 'toggle':
          await handleToggle(interaction);
          break;
        case 'test':
          await handleTest(interaction);
          break;
        case 'status':
          await handleStatus(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (error) {
      logger.error('Error in welcome command:', error);
      await interaction.reply({
        content: 'An error occurred while processing the welcome command.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.options.getChannel('channel', true) as any;
  const message = interaction.options.getString('message') || 'Welcome to {server}, {user}! 🎉';
  const role = interaction.options.getRole('role');

  // Basic permission check for target channel
  const me = interaction.guild!.members.me;
  if (me) {
  const perms = (channel && 'permissionsFor' in channel) ? channel.permissionsFor(me) : null;
    if (!perms?.has(PermissionFlagsBits.ViewChannel) || !perms?.has(PermissionFlagsBits.SendMessages)) {
      await interaction.reply({
        content: '❌ I do not have permission to view or send messages in that channel.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
  }

  // Upsert welcome settings
  await db('welcome_settings')
    .insert({
      guild_id: interaction.guild!.id,
      channel_id: channel.id,
      welcome_message: message,
      welcome_role_id: role?.id || null,
      enabled: true,
      created_at: new Date(),
      updated_at: new Date()
    })
    .onConflict('guild_id')
    .merge({
      channel_id: channel.id,
      welcome_message: message,
      welcome_role_id: role?.id || null,
      enabled: true,
      updated_at: new Date()
    });

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('✅ Welcome System Configured')
    .addFields([
      { name: 'Channel', value: `<#${channel.id}>`, inline: true },
      { name: 'Role', value: role ? `<@&${role.id}>` : 'None', inline: true },
      { name: 'Enabled', value: 'Yes', inline: true },
      { name: 'Message', value: message, inline: false }
    ])
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleToggle(interaction: ChatInputCommandInteraction): Promise<void> {
  const enabled = interaction.options.getBoolean('enabled', true);

  const existingSettings = await db('welcome_settings')
    .where('guild_id', interaction.guild!.id)
    .first();

  if (!existingSettings) {
    await interaction.reply({
      content: 'Welcome system is not configured yet. Use `/welcome setup` first.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await db('welcome_settings')
    .where('guild_id', interaction.guild!.id)
    .update({ 
      enabled,
      updated_at: new Date()
    });

  await interaction.reply({
    content: `✅ Welcome messages ${enabled ? 'enabled' : 'disabled'}.`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleTest(interaction: ChatInputCommandInteraction): Promise<void> {
  const settings = await db('welcome_settings')
    .where('guild_id', interaction.guild!.id)
    .first();

  if (!settings || !settings.enabled) {
    await interaction.reply({
      content: 'Welcome system is not configured or enabled.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  let member = interaction.guild!.members.cache.get(interaction.user.id);
  if (!member) {
    try {
      member = await interaction.guild!.members.fetch(interaction.user.id);
    } catch {
      // ignore
    }
  }
  if (!member) {
    await interaction.reply({
      content: 'Could not find your member data.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const welcomeMessage = settings.welcome_message
    .replace('{user}', `<@${member.id}>`)
    .replace('{username}', member.user.username)
    .replace('{server}', interaction.guild!.name)
    .replace('{memberCount}', interaction.guild!.memberCount.toString());

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle(`Welcome to ${interaction.guild!.name}! 🎉`)
    .setDescription(welcomeMessage)
    .setThumbnail(member.user.displayAvatarURL())
    .addFields([
      { name: 'Member Count', value: `${interaction.guild!.memberCount}`, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
    ])
    .setTimestamp()
    .setFooter({ text: `User ID: ${member.id}` });

  await interaction.reply({ 
    content: '🧪 **Welcome Message Test:**',
    embeds: [welcomeEmbed],
    flags: MessageFlags.Ephemeral
  });
}

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const settings = await db('welcome_settings')
    .where('guild_id', interaction.guild!.id)
    .first();

  if (!settings) {
    await interaction.reply({
      content: 'Welcome system is not configured. Use `/welcome setup` to get started.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const channel = interaction.guild!.channels.cache.get(settings.channel_id);
  const role = settings.welcome_role_id ? interaction.guild!.roles.cache.get(settings.welcome_role_id) : null;

  const embed = new EmbedBuilder()
    .setColor(settings.enabled ? 0x00ff00 : 0xff0000)
    .setTitle('Welcome System Status')
    .addFields([
      { name: 'Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Channel', value: channel ? `<#${channel.id}>` : '❌ Channel not found', inline: true },
      { name: 'Auto Role', value: role ? `<@&${role.id}>` : 'None', inline: true },
      { name: 'Message', value: settings.welcome_message, inline: false }
    ])
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export default welcome;