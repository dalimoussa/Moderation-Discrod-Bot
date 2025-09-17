import {
  CategoryChannel,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  Guild,
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { logger } from '@/shared/utils/logger';
import knex from 'knex';

// Use compiled CommonJS knex configuration
const config = require('../../../knexfile.js');
const environment = process.env.NODE_ENV || 'development';
const knexConfig = (config as any)[environment];
const db = knex(knexConfig);

interface TicketCategory {
  id: number;
  guildId: string;
  name: string;
  description?: string;
  emoji?: string;
  staffRoles: string[];
  maxOpenPerUser: number;
  requireReason: boolean;
  autoResponses: Record<string, string>;
}

interface Ticket {
  id: number;
  guildId: string;
  channelId: string;
  creatorId: string;
  assignedTo?: string;
  categoryId?: number;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  reason?: string;
  resolution?: string;
  closedAt?: Date;
  closedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TicketService {
  async createTicketCategory(
    guildId: string,
    name: string,
    description?: string,
    options: Partial<TicketCategory> = {}
  ): Promise<TicketCategory> {
    try {
      const [category] = await db('ticket_categories')
        .insert({
          guild_id: guildId,
          name,
          description,
          emoji: options.emoji,
          staff_roles: options.staffRoles || [],
          max_open_per_user: options.maxOpenPerUser || 1,
          require_reason: options.requireReason || false,
          auto_responses: options.autoResponses || {}
        })
        .returning('*');

      return this.mapDbTicketCategory(category);
    } catch (error) {
      logger.error('Error creating ticket category:', error);
      throw error;
    }
  }

  async createTicket(
    guild: Guild,
    creator: GuildMember,
    categoryId?: number,
    reason?: string
  ): Promise<{ ticket: Ticket; channel: TextChannel }> {
    try {
      // Check if user has reached max open tickets
      const category = categoryId ? await this.getTicketCategory(categoryId) : null;
      const maxOpen = category?.maxOpenPerUser || 1;

      const openTickets = await db('tickets')
        .where('guild_id', guild.id)
        .where('creator_id', creator.id)
        .whereIn('status', ['open', 'pending'])
        .count('* as count')
        .first();

      if (parseInt(openTickets?.count as string) >= maxOpen) {
        throw new Error(`You already have ${maxOpen} open ticket(s). Please close existing tickets before creating new ones.`);
      }

      // Create ticket category if it doesn't exist
      let ticketCategory = await guild.channels.cache.find(
        c => c.name === 'tickets' && c.type === ChannelType.GuildCategory
      ) as CategoryChannel;

      if (!ticketCategory) {
        ticketCategory = await guild.channels.create({
          name: '🎫 Tickets',
          type: ChannelType.GuildCategory
        });
      }

      // Generate unique ticket number
      const ticketCount = await db('tickets')
        .where('guild_id', guild.id)
        .count('* as count')
        .first();

      const ticketNumber = (parseInt(ticketCount?.count as string) + 1).toString().padStart(4, '0');

      // Create ticket channel
      const channelName = `ticket-${ticketNumber}`;
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketCategory.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: creator.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          },
          {
            id: guild.members.me!.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }
        ]
      });

      // Add staff role permissions if category specified
      if (category && category.staffRoles.length > 0) {
        for (const roleId of category.staffRoles) {
          const role = guild.roles.cache.get(roleId);
          if (role) {
            await channel.permissionOverwrites.create(role, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true
            });
          }
        }
      }

      // Create database record
      const [ticketRecord] = await db('tickets')
        .insert({
          guild_id: guild.id,
          channel_id: channel.id,
          creator_id: creator.id,
          category_id: categoryId,
          status: 'open',
          priority: 'normal',
          reason
        })
        .returning('*');

      const ticket = this.mapDbTicket(ticketRecord);

      // Send welcome message
      await this.sendWelcomeMessage(channel, creator, ticket, category || undefined);

      logger.info(`Created ticket ${ticket.id} for user ${creator.id} in guild ${guild.id}`);
      return { ticket, channel };
    } catch (error) {
      logger.error('Error creating ticket:', error);
      throw error;
    }
  }

  async closeTicket(
    ticketId: number,
    closedBy: GuildMember,
    resolution?: string,
    deleteChannel: boolean = false
  ): Promise<void> {
    try {
      const ticket = await this.getTicket(ticketId);
      if (!ticket) throw new Error('Ticket not found');

      // Update database
      await db('tickets')
        .where('id', ticketId)
        .update({
          status: 'closed',
          resolution,
          closed_at: new Date(),
          closed_by: closedBy.id,
          updated_at: new Date()
        });

      // Get channel and create transcript
      const channel = closedBy.guild.channels.cache.get(ticket.channelId) as TextChannel;
      if (channel) {
        // Create transcript
        await this.createTranscript(channel, ticket);

        if (deleteChannel) {
          await channel.delete('Ticket closed');
        } else {
          // Archive the channel
          await channel.setName(`closed-${channel.name}`);
          await channel.permissionOverwrites.edit(ticket.creatorId, {
            SendMessages: false
          });

          const embed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setDescription(`This ticket has been closed by ${closedBy}.`)
            .addFields(
              { name: 'Resolution', value: resolution || 'No resolution provided', inline: false },
              { name: 'Closed At', value: new Date().toLocaleString(), inline: true }
            )
            .setColor(0xe74c3c);

          await channel.send({ embeds: [embed] });
        }
      }

      logger.info(`Closed ticket ${ticketId} by ${closedBy.id}`);
    } catch (error) {
      logger.error('Error closing ticket:', error);
      throw error;
    }
  }

  async assignTicket(ticketId: number, assignee: GuildMember): Promise<void> {
    try {
      await db('tickets')
        .where('id', ticketId)
        .update({
          assigned_to: assignee.id,
          status: 'pending',
          updated_at: new Date()
        });

      const ticket = await this.getTicket(ticketId);
      if (ticket) {
        const channel = assignee.guild.channels.cache.get(ticket.channelId) as TextChannel;
        if (channel) {
          // Give assignee permissions
          await channel.permissionOverwrites.create(assignee, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          });

          const embed = new EmbedBuilder()
            .setTitle('👤 Ticket Assigned')
            .setDescription(`This ticket has been assigned to ${assignee}.`)
            .setColor(0x3498db);

          await channel.send({ embeds: [embed] });
        }
      }

      logger.info(`Assigned ticket ${ticketId} to ${assignee.id}`);
    } catch (error) {
      logger.error('Error assigning ticket:', error);
      throw error;
    }
  }

  async setPriority(ticketId: number, priority: Ticket['priority']): Promise<void> {
    try {
      await db('tickets')
        .where('id', ticketId)
        .update({
          priority,
          updated_at: new Date()
        });

      logger.info(`Set ticket ${ticketId} priority to ${priority}`);
    } catch (error) {
      logger.error('Error setting ticket priority:', error);
      throw error;
    }
  }

  async getTicket(ticketId: number): Promise<Ticket | null> {
    try {
      const ticket = await db('tickets')
        .where('id', ticketId)
        .first();

      return ticket ? this.mapDbTicket(ticket) : null;
    } catch (error) {
      logger.error('Error getting ticket:', error);
      return null;
    }
  }

  async getTicketByChannel(channelId: string): Promise<Ticket | null> {
    try {
      const ticket = await db('tickets')
        .where('channel_id', channelId)
        .first();

      return ticket ? this.mapDbTicket(ticket) : null;
    } catch (error) {
      logger.error('Error getting ticket by channel:', error);
      return null;
    }
  }

  async getUserTickets(guildId: string, userId: string): Promise<Ticket[]> {
    try {
      const tickets = await db('tickets')
        .where('guild_id', guildId)
        .where('creator_id', userId)
        .orderBy('created_at', 'desc');

      return tickets.map(this.mapDbTicket);
    } catch (error) {
      logger.error('Error getting user tickets:', error);
      return [];
    }
  }

  async getGuildTickets(guildId: string, status?: string): Promise<Ticket[]> {
    try {
      let query = db('tickets').where('guild_id', guildId);
      
      if (status) {
        query = query.where('status', status);
      }

      const tickets = await query.orderBy('created_at', 'desc');
      return tickets.map(this.mapDbTicket);
    } catch (error) {
      logger.error('Error getting guild tickets:', error);
      return [];
    }
  }

  private async getTicketCategory(categoryId: number): Promise<TicketCategory | null> {
    try {
      const category = await db('ticket_categories')
        .where('id', categoryId)
        .first();

      return category ? this.mapDbTicketCategory(category) : null;
    } catch (error) {
      logger.error('Error getting ticket category:', error);
      return null;
    }
  }

  private async sendWelcomeMessage(
    channel: TextChannel,
    creator: GuildMember,
    ticket: Ticket,
    category?: TicketCategory
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(`🎫 Ticket #${ticket.id}`)
      .setDescription(`Hello ${creator}! Your ticket has been created.`)
      .addFields(
        { name: 'Category', value: category?.name || 'General', inline: true },
        { name: 'Priority', value: ticket.priority, inline: true },
        { name: 'Status', value: ticket.status, inline: true }
      )
      .setColor(0x2ecc71)
      .setFooter({ text: 'A staff member will be with you shortly.' });

    if (ticket.reason) {
      embed.addFields({ name: 'Reason', value: ticket.reason, inline: false });
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticket.id}`)
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId(`ticket_priority_${ticket.id}`)
          .setLabel('Set Priority')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⚡'),
        new ButtonBuilder()
          .setCustomId(`ticket_assign_${ticket.id}`)
          .setLabel('Assign to Me')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👤')
      );

    await channel.send({ embeds: [embed], components: [row] });

    // Send auto-response if configured
    if (category?.autoResponses.welcome) {
      await channel.send(category.autoResponses.welcome);
    }
  }

  private async createTranscript(channel: TextChannel, ticket: Ticket): Promise<void> {
    try {
      // Fetch all messages in the channel
      const messages = await channel.messages.fetch({ limit: 100 });
      const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      // Create transcript content
      const transcript = sortedMessages.map(msg => {
        const timestamp = msg.createdAt.toLocaleString();
        const author = msg.author.tag;
        const content = msg.content || '[No content]';
        const attachments = msg.attachments.size > 0 ? 
          `\n[Attachments: ${msg.attachments.map(a => a.url).join(', ')}]` : '';
        
        return `[${timestamp}] ${author}: ${content}${attachments}`;
      }).join('\n');

      // Log the transcript (in production, you might save this to a file or database)
      logger.info(`Transcript for ticket ${ticket.id}:\n${transcript}`);

      // You could also send the transcript to a logs channel or save it as a file
    } catch (error) {
      logger.error('Error creating transcript:', error);
    }
  }

  private mapDbTicket(dbTicket: any): Ticket {
    const ticket: Ticket = {
      id: dbTicket.id,
      guildId: dbTicket.guild_id,
      channelId: dbTicket.channel_id,
      creatorId: dbTicket.creator_id,
      assignedTo: dbTicket.assigned_to,
      categoryId: dbTicket.category_id,
      status: dbTicket.status,
      priority: dbTicket.priority,
      reason: dbTicket.reason,
      resolution: dbTicket.resolution,
      closedBy: dbTicket.closed_by,
      createdAt: new Date(dbTicket.created_at),
      updatedAt: new Date(dbTicket.updated_at)
    };

    if (dbTicket.closed_at) {
      ticket.closedAt = new Date(dbTicket.closed_at);
    }

    return ticket;
  }

  private mapDbTicketCategory(dbCategory: any): TicketCategory {
    return {
      id: dbCategory.id,
      guildId: dbCategory.guild_id,
      name: dbCategory.name,
      description: dbCategory.description,
      emoji: dbCategory.emoji,
      staffRoles: dbCategory.staff_roles || [],
      maxOpenPerUser: dbCategory.max_open_per_user,
      requireReason: dbCategory.require_reason,
      autoResponses: dbCategory.auto_responses || {}
    };
  }
}