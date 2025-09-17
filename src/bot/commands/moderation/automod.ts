import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  MessageFlags
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { AutomodService } from '@/shared/services/automod';

const automodService = new AutomodService();

export default {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure automatic moderation settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable automod for this server'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable automod for this server'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('View current automod configuration'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('filter')
        .setDescription('Configure specific filters')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Filter type to configure')
            .setRequired(true)
            .addChoices(
              { name: 'Profanity', value: 'profanity' },
              { name: 'Spam', value: 'spam' },
              { name: 'Links', value: 'links' },
              { name: 'Caps', value: 'caps' },
              { name: 'Mentions', value: 'mentions' },
              { name: 'Zalgo', value: 'zalgo' }
            ))
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable this filter')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('logchannel')
        .setDescription('Set the automod log channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel for automod logs')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('exempt')
        .setDescription('Manage exemptions from automod')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Exemption type')
            .setRequired(true)
            .addChoices(
              { name: 'Role', value: 'role' },
              { name: 'Channel', value: 'channel' },
              { name: 'User', value: 'user' }
            ))
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Add or remove exemption')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' }
            )))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false) as SlashCommandBuilder,

  guildOnly: true,
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'enable':
          await handleEnable(interaction);
          break;
        case 'disable':
          await handleDisable(interaction);
          break;
        case 'config':
          await handleConfig(interaction);
          break;
        case 'filter':
          await handleFilter(interaction);
          break;
        case 'logchannel':
          await handleLogChannel(interaction);
          break;
        case 'exempt':
          await handleExempt(interaction);
          break;
        default:
          await interaction.reply({
            content: '❌ Unknown subcommand.',
            flags: MessageFlags.Ephemeral
          });
      }
    } catch (error) {
      console.error('Error in automod command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while executing the command.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
} satisfies Command;

async function handleEnable(interaction: ChatInputCommandInteraction) {
  await automodService.enableAutomod(interaction.guild!.id);
  
  const embed = new EmbedBuilder()
    .setTitle('✅ Automod Enabled')
    .setDescription('Automatic moderation has been enabled for this server.')
    .setColor(0x2ecc71)
    .addFields(
      { name: 'Next Steps', value: '• Use `/automod filter` to configure specific filters\n• Use `/automod logchannel` to set up logging\n• Use `/automod exempt` to add exemptions', inline: false }
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleDisable(interaction: ChatInputCommandInteraction) {
  await automodService.disableAutomod(interaction.guild!.id);
  
  const embed = new EmbedBuilder()
    .setTitle('🔴 Automod Disabled')
    .setDescription('Automatic moderation has been disabled for this server.')
    .setColor(0xe74c3c);

  await interaction.reply({ embeds: [embed] });
}

async function handleConfig(interaction: ChatInputCommandInteraction) {
  const config = await automodService.getConfig(interaction.guild!.id);
  
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Automod Configuration')
    .setDescription('Current automod settings for this server:')
    .setColor(config.enabled ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: 'Status', value: config.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
      { name: 'Filters Active', value: config.filters ? Object.entries(config.filters)
        .filter(([_, filter]: [string, any]) => filter?.enabled)
        .map(([name]) => name)
        .join(', ') || 'None' : 'None', inline: true },
      { name: 'Log Channel', value: config.log_channel_id ? `<#${config.log_channel_id}>` : 'Not set', inline: true }
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleFilter(interaction: ChatInputCommandInteraction) {
  const filterType = interaction.options.getString('type', true);
  const enabled = interaction.options.getBoolean('enabled', true);

  await automodService.updateFilter(interaction.guild!.id, filterType, enabled);

  const embed = new EmbedBuilder()
    .setTitle(`🔧 Filter ${enabled ? 'Enabled' : 'Disabled'}`)
    .setDescription(`The **${filterType}** filter has been ${enabled ? 'enabled' : 'disabled'}.`)
    .setColor(enabled ? 0x2ecc71 : 0xe74c3c);

  await interaction.reply({ embeds: [embed] });
}

async function handleLogChannel(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel('channel', true);

  await automodService.setLogChannel(interaction.guild!.id, channel.id);

  const embed = new EmbedBuilder()
    .setTitle('📝 Log Channel Set')
    .setDescription(`Automod logs will now be sent to ${channel}.`)
    .setColor(0x3498db);

  await interaction.reply({ embeds: [embed] });
}

async function handleExempt(interaction: ChatInputCommandInteraction) {
  const type = interaction.options.getString('type', true);
  const action = interaction.options.getString('action', true);

  const embed = new EmbedBuilder()
    .setTitle(`${action === 'add' ? '➕' : '➖'} Exemption ${action === 'add' ? 'Added' : 'Removed'}`)
    .setDescription(`${type} exemption has been ${action === 'add' ? 'added' : 'removed'}.`)
    .setColor(action === 'add' ? 0x2ecc71 : 0xe74c3c);

  await interaction.reply({ embeds: [embed] });
}