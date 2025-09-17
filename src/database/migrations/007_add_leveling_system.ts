import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if user_levels table exists, if not create it
  const hasUserLevels = await knex.schema.hasTable('user_levels');
  if (!hasUserLevels) {
    await knex.schema.createTable('user_levels', (table) => {
      table.increments('id').primary();
      table.string('guild_id').notNullable();
      table.string('user_id').notNullable();
      table.integer('level').defaultTo(0);
      table.bigInteger('xp').defaultTo(0);
      table.bigInteger('total_xp').defaultTo(0);
      table.bigInteger('message_count').defaultTo(0);
      table.bigInteger('voice_time').defaultTo(0); // In seconds
      table.timestamp('last_message_at').nullable();
      table.timestamp('last_voice_at').nullable();
      table.jsonb('achievements').defaultTo('[]');
      table.timestamps(true, true);
      
      table.unique(['guild_id', 'user_id']);
      table.index(['guild_id', 'level']);
      table.index(['guild_id', 'xp']);
    });
  }

  // Check if level_rewards table exists, if not create it
  const hasLevelRewards = await knex.schema.hasTable('level_rewards');
  if (!hasLevelRewards) {
    await knex.schema.createTable('level_rewards', (table) => {
      table.increments('id').primary();
      table.string('guild_id').notNullable();
      table.integer('level').notNullable();
      table.enum('reward_type', ['role', 'currency', 'badge']).notNullable();
      table.string('reward_value').notNullable(); // role ID, currency amount, badge name
      table.text('description').nullable();
      table.boolean('stackable').defaultTo(true);
      table.timestamps(true, true);
      
      table.unique(['guild_id', 'level', 'reward_type', 'reward_value']);
      table.index(['guild_id', 'level']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('level_rewards');
  await knex.schema.dropTableIfExists('user_levels');
}