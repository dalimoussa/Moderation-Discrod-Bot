import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Welcome settings table
  await knex.schema.createTable('welcome_settings', (table) => {
    table.string('guild_id').primary();
    table.string('channel_id').nullable();
    table.text('welcome_message').defaultTo('Welcome to the server, {user}!');
    table.boolean('enabled').defaultTo(false);
    table.string('welcome_role_id').nullable();
    table.timestamps(true, true);
  });

  // Music queue table
  await knex.schema.createTable('music_queue', (table) => {
    table.increments('id').primary();
    table.string('guild_id').notNullable();
    table.string('channel_id').notNullable();
    table.string('user_id').notNullable();
    table.text('url').notNullable();
    table.string('title').notNullable();
    table.string('duration').nullable();
    table.string('thumbnail').nullable();
    table.integer('position').defaultTo(0);
    table.boolean('is_playing').defaultTo(false);
    table.timestamps(true, true);

    table.index(['guild_id', 'position']);
  });

  // Music settings table
  await knex.schema.createTable('music_settings', (table) => {
    table.string('guild_id').primary();
    table.integer('volume').defaultTo(50);
    table.boolean('loop').defaultTo(false);
    table.boolean('shuffle').defaultTo(false);
    table.string('default_channel_id').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('music_settings');
  await knex.schema.dropTableIfExists('music_queue');
  await knex.schema.dropTableIfExists('welcome_settings');
}