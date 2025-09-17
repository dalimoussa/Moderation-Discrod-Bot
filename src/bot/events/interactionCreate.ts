import { 
  Events, 
  ChatInputCommandInteraction, 
  AutocompleteInteraction,
  PermissionsBitField,
  Collection,
  MessageFlags
} from 'discord.js';
import { Event } from '../interfaces/event';
import { logger, logCommand, logError } from '@/shared/utils/logger';
import { BotClient } from '../client';

export default {
  name: Events.InteractionCreate,
  
  async execute(interaction): Promise<void> {
    const client = interaction.client as unknown as BotClient;

    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction, client);
    } else if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction, client);
    }
  }
} satisfies Event<Events.InteractionCreate>;

async function handleSlashCommand(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    logger.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }

  const startTime = Date.now();
  
  try {
    // Check if command is guild-only
    if (command.guildOnly && !interaction.inGuild()) {
      await interaction.reply({
        content: '❌ This command can only be used in servers.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Check if user is bot owner (for owner-only commands)
    if (command.ownerOnly && interaction.user.id !== process.env.BOT_OWNER_ID) {
      await interaction.reply({
        content: '❌ This command is restricted to the bot owner.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Check user permissions
    if (command.permissions && interaction.inGuild() && interaction.member) {
      const memberPermissions = interaction.member.permissions as PermissionsBitField;
      
      if (!memberPermissions.has(command.permissions)) {
        await interaction.reply({
          content: '❌ You do not have permission to use this command.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
    }

    // Check cooldown
    if (command.cooldown) {
      const now = Date.now();
      
      if (!client.cooldowns.has(interaction.commandName)) {
        client.cooldowns.set(interaction.commandName, new Collection<string, number>());
      }
      
      const timestamps = client.cooldowns.get(interaction.commandName)!;
      const cooldownAmount = command.cooldown * 1000;
      
      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;
        
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          await interaction.reply({
            content: `❌ Please wait ${timeLeft.toFixed(1)} more seconds before using this command again.`,
            flags: MessageFlags.Ephemeral
          });
          return;
        }
      }
      
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
    }

    // Execute command
    logger.info(`Executing command: ${interaction.commandName} for user: ${interaction.user.id}`);
    await command.execute(interaction);
    
    const executionTime = Date.now() - startTime;
    logCommand(
      interaction.commandName,
      interaction.user.id,
      interaction.guildId || 'DM',
      true,
      executionTime
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logError(error as Error, {
      context: 'SlashCommand',
      command: interaction.commandName,
      userId: interaction.user.id,
      guildId: interaction.guildId
    });
    
    logCommand(
      interaction.commandName,
      interaction.user.id,
      interaction.guildId || 'DM',
      false,
      executionTime
    );

    const errorMessage = '❌ An error occurred while executing this command.';

    // If the interaction is unknown or already acknowledged, skip sending a response.
    const errCode = (error as any)?.code;
    if (errCode === 10062 /* Unknown interaction */ || errCode === 40060 /* Already acknowledged */) {
      return;
    }

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
      } else if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
      }
    } catch (followUpError) {
      logError(followUpError as Error, { 
        context: 'SlashCommand.errorResponse',
        originalError: error instanceof Error ? error.message : 'Unknown'
      });
      // Don't throw here - we want to continue processing other interactions
    }
  }
}

async function handleAutocomplete(interaction: AutocompleteInteraction, client: BotClient): Promise<void> {
  const command = client.commands.get(interaction.commandName);
  
  if (!command?.autocomplete) {
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logError(error as Error, {
      context: 'Autocomplete',
      command: interaction.commandName,
      userId: interaction.user.id,
      guildId: interaction.guildId
    });
  }
}