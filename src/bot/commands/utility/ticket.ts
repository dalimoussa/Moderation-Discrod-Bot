import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  GuildMember
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { TicketService } from '@/shared/services/tickets';

const ticketService = new TicketService();

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage support tickets')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new support ticket')
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for creating the ticket')
            .setRequired(false)
            .setMaxLength(500)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Close the current ticket')
        .addStringOption(option =>
          option.setName('resolution')
            .setDescription('Resolution summary')
            .setRequired(false)
            .setMaxLength(1000))
        .addBooleanOption(option =>
          option.setName('delete')
            .setDescription('Delete the channel after closing')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('assign')
        .setDescription('Assign ticket to a staff member')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Staff member to assign to')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('priority')
        .setDescription('Set ticket priority')
        .addStringOption(option =>
          option.setName('level')
            .setDescription('Priority level')
            .setRequired(true)
            .addChoices(
              { name: 'Low', value: 'low' },
              { name: 'Normal', value: 'normal' },
              { name: 'High', value: 'high' },
              { name: 'Urgent', value: 'urgent' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List tickets')
        .addStringOption(option =>
          option.setName('status')
            .setDescription('Filter by status')
            .setRequired(false)
            .addChoices(
              { name: 'Open', value: 'open' },
              { name: 'Pending', value: 'pending' },
              { name: 'Resolved', value: 'resolved' },
              { name: 'Closed', value: 'closed' }
            ))
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Filter by user')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup ticket panel')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Panel title')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Panel description')
            .setRequired(false)))
    .setDMPermission(false) as SlashCommandBuilder,

  guildOnly: true,
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'create':
          await handleCreate(interaction);
          break;
        case 'close':
          await handleClose(interaction);
          break;
        case 'assign':
          await handleAssign(interaction);
          break;
        case 'priority':
          await handlePriority(interaction);
          break;
        case 'list':
          await handleList(interaction);
          break;
        case 'setup':
          await handleSetup(interaction);
          break;
        default:
          await interaction.reply({
            content: '❌ Unknown subcommand.',
            flags: MessageFlags.Ephemeral
          });
      }
    } catch (error) {
      console.error('Error in ticket command:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `❌ ${errorMessage}`,
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
} satisfies Command;

async function handleCreate(interaction: ChatInputCommandInteraction) {
  const reason = interaction.options.getString('reason');
  
  try {
    const { ticket, channel } = await ticketService.createTicket(
      interaction.guild!,
      interaction.member as GuildMember,
      undefined,
      reason || undefined
    );

    const embed = new EmbedBuilder()
      .setTitle('🎫 Ticket Created')
      .setDescription(`Your ticket has been created! Please go to ${channel} to continue.`)
      .addFields(
        { name: 'Ticket ID', value: `#${ticket.id}`, inline: true },
        { name: 'Status', value: ticket.status, inline: true },
        { name: 'Priority', value: ticket.priority, inline: true }
      )
      .setColor(0x2ecc71);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    throw error;
  }
}

async function handleClose(interaction: ChatInputCommandInteraction) {
  // Check if user has permission to close tickets
  if (!(interaction.member as GuildMember).permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error('You do not have permission to close tickets.');
  }

  const resolution = interaction.options.getString('resolution');
  const deleteChannel = interaction.options.getBoolean('delete') || false;

  // Get ticket from current channel
  const ticket = await ticketService.getTicketByChannel(interaction.channel!.id);
  if (!ticket) {
    throw new Error('This is not a ticket channel.');
  }

  if (ticket.status === 'closed') {
    throw new Error('This ticket is already closed.');
  }

  await ticketService.closeTicket(
    ticket.id,
    interaction.member as GuildMember,
    resolution || undefined,
    deleteChannel
  );

  const embed = new EmbedBuilder()
    .setTitle('✅ Ticket Closed')
    .setDescription('The ticket has been closed successfully.')
    .setColor(0x2ecc71);

  if (deleteChannel) {
    await interaction.reply({ embeds: [embed], ephemeral: true });
    // Channel will be deleted by the service
  } else {
    await interaction.reply({ embeds: [embed] });
  }
}

async function handleAssign(interaction: ChatInputCommandInteraction) {
  // Check if user has permission to assign tickets
  if (!(interaction.member as GuildMember).permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error('You do not have permission to assign tickets.');
  }

  const assignee = interaction.options.getMember('user');
  if (!assignee) {
    throw new Error('User not found in this server.');
  }

  // Get ticket from current channel
  const ticket = await ticketService.getTicketByChannel(interaction.channel!.id);
  if (!ticket) {
    throw new Error('This is not a ticket channel.');
  }

  await ticketService.assignTicket(ticket.id, assignee as GuildMember);

  const embed = new EmbedBuilder()
    .setTitle('👤 Ticket Assigned')
    .setDescription(`Ticket has been assigned to ${assignee}.`)
    .setColor(0x3498db);

  await interaction.reply({ embeds: [embed] });
}

async function handlePriority(interaction: ChatInputCommandInteraction) {
  // Check if user has permission to set priority
  if (!(interaction.member as GuildMember).permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error('You do not have permission to set ticket priority.');
  }

  const priority = interaction.options.getString('level', true) as 'low' | 'normal' | 'high' | 'urgent';

  // Get ticket from current channel
  const ticket = await ticketService.getTicketByChannel(interaction.channel!.id);
  if (!ticket) {
    throw new Error('This is not a ticket channel.');
  }

  await ticketService.setPriority(ticket.id, priority);

  const priorityEmojis = {
    low: '🟢',
    normal: '🟡',
    high: '🟠',
    urgent: '🔴'
  };

  const embed = new EmbedBuilder()
    .setTitle('⚡ Priority Updated')
    .setDescription(`Ticket priority has been set to ${priorityEmojis[priority]} **${priority.toUpperCase()}**.`)
    .setColor(0xf39c12);

  await interaction.reply({ embeds: [embed] });
}

async function handleList(interaction: ChatInputCommandInteraction) {
  const status = interaction.options.getString('status');
  const user = interaction.options.getUser('user');

  let tickets;
  if (user) {
    tickets = await ticketService.getUserTickets(interaction.guild!.id, user.id);
    if (status) {
      tickets = tickets.filter(t => t.status === status);
    }
  } else {
    tickets = await ticketService.getGuildTickets(interaction.guild!.id, status || undefined);
  }

  if (tickets.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('📋 No Tickets Found')
      .setDescription('No tickets match the specified criteria.')
      .setColor(0x95a5a6);

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // Show first 10 tickets
  const displayTickets = tickets.slice(0, 10);
  
  const embed = new EmbedBuilder()
    .setTitle(`📋 Tickets ${user ? `for ${user.tag}` : 'in this server'}`)
    .setDescription(displayTickets.map(ticket => {
      const creator = interaction.guild!.members.cache.get(ticket.creatorId);
      const statusEmoji = {
        open: '🟢',
        pending: '🟡',
        resolved: '🔵',
        closed: '🔴'
      }[ticket.status];

      return `${statusEmoji} **#${ticket.id}** - ${creator?.user.tag || 'Unknown'} - ${ticket.status}`;
    }).join('\n'))
    .setColor(0x3498db)
    .setFooter({ text: `Showing ${displayTickets.length} of ${tickets.length} tickets` });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSetup(interaction: ChatInputCommandInteraction) {
  // Check if user has permission to setup tickets
  if (!(interaction.member as GuildMember).permissions.has(PermissionFlagsBits.ManageGuild)) {
    throw new Error('You do not have permission to setup ticket panels.');
  }

  const title = interaction.options.getString('title') || '🎫 Support Tickets';
  const description = interaction.options.getString('description') || 
    'Need help? Click the button below to create a support ticket.';

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .addFields(
      { name: '📋 How it works', value: '1. Click "Create Ticket"\n2. Describe your issue\n3. Wait for staff response\n4. Work with staff to resolve', inline: false },
      { name: '⏰ Response Time', value: 'We typically respond within 24 hours', inline: true },
      { name: '🔒 Privacy', value: 'Only you and staff can see your ticket', inline: true }
    )
    .setColor(0x3498db);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_create_general')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫')
    );

  await interaction.reply({
    content: 'Ticket panel has been created!',
    ephemeral: true
  });

  await interaction.followUp({
    embeds: [embed],
    components: [row]
  });
}