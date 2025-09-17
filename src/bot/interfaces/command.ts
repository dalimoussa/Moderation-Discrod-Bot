import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionResolvable,
  AutocompleteInteraction
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  permissions?: PermissionResolvable[];
  ownerOnly?: boolean;
  guildOnly?: boolean;
  cooldown?: number; // in seconds
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}