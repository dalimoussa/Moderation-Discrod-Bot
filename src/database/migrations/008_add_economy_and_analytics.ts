import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if user_economy table exists, if not create it
  const hasUserEconomy = await knex.schema.hasTable('user_economy');
  if (!hasUserEconomy) {
    await knex.schema.createTable('user_economy', (table) => {
      table.increments('id').primary();
      table.string('guild_id').notNullable();
      table.string('user_id').notNullable();
      table.bigInteger('balance').defaultTo(0);
      table.bigInteger('bank_balance').defaultTo(0);
      table.integer('bank_limit').defaultTo(10000);
      table.jsonb('inventory').defaultTo('{}'); // {itemId: quantity}
      table.timestamp('last_daily').nullable();
      table.timestamp('last_weekly').nullable();
      table.integer('daily_streak').defaultTo(0);
      table.bigInteger('total_earned').defaultTo(0);
      table.bigInteger('total_spent').defaultTo(0);
      table.timestamps(true, true);
      
      table.unique(['guild_id', 'user_id']);
      table.index(['guild_id', 'balance']);
    });
  }

  // Check if economy_items table exists, if not create it
  const hasEconomyItems = await knex.schema.hasTable('economy_items');
  if (!hasEconomyItems) {
    await knex.schema.createTable('economy_items', (table) => {
      table.increments('id').primary();
      table.string('guild_id').notNullable();
      table.string('name', 50).notNullable();
      table.text('description').nullable();
      table.string('emoji').nullable();
      table.integer('price').notNullable();
      table.enum('item_type', ['consumable', 'collectible', 'role', 'badge']).notNullable();
      table.jsonb('metadata').defaultTo('{}'); // Additional item data
      table.boolean('purchasable').defaultTo(true);
      table.integer('stock').nullable(); // null = unlimited
      table.jsonb('requirements').defaultTo('{}'); // Level, role requirements
      table.timestamps(true, true);
      
      table.unique(['guild_id', 'name']);
      table.index(['guild_id', 'item_type']);
      table.index(['guild_id', 'purchasable']);
    });
  }

  // Check if command_usage table exists, if not create it
  const hasCommandUsage = await knex.schema.hasTable('command_usage');
  if (!hasCommandUsage) {
    await knex.schema.createTable('command_usage', (table) => {
      table.increments('id').primary();
      table.string('guild_id').notNullable();
      table.string('user_id').notNullable();
      table.string('command_name').notNullable();
      table.string('channel_id').notNullable();
      table.boolean('success').notNullable();
      table.integer('execution_time').nullable(); // milliseconds
      table.text('error_message').nullable();
      table.jsonb('metadata').defaultTo('{}');
      table.timestamps(true, true);
      
      table.index(['guild_id', 'command_name']);
      table.index(['guild_id', 'user_id']);
      table.index(['created_at']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('command_usage');
  await knex.schema.dropTableIfExists('economy_items');
  await knex.schema.dropTableIfExists('user_economy');
}