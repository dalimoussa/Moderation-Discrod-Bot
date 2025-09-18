#!/usr/bin/env node

const { spawn } = require('child_process');
const Knex = require('knex');
const config = require('./knexfile.js');

console.log('🚀 Starting Aegis Discord Bot with database migration...');

async function runMigrations() {
  console.log('📊 Running database migrations...');
  
  try {
    const environment = process.env.NODE_ENV || 'production';
    const knexConfig = config[environment];
    
    console.log(`🔧 Using environment: ${environment}`);
    console.log(`📍 Migration directory: ${knexConfig.migrations.directory}`);
    
    const knex = Knex(knexConfig);
    
    // Run migrations
    const [batchNo, log] = await knex.migrate.latest();
    
    if (log.length === 0) {
      console.log('✅ Database is already up to date');
    } else {
      console.log(`✅ Ran ${log.length} migrations:`);
      log.forEach(file => console.log(`  - ${file}`));
    }
    
    await knex.destroy();
    return true;
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

// Run migrations and then start bot
runMigrations().then((success) => {
  if (success) {
    console.log('🤖 Starting Discord bot...');
    const bot = spawn('node', ['start.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Forward signals to the bot process
    process.on('SIGTERM', () => bot.kill('SIGTERM'));
    process.on('SIGINT', () => bot.kill('SIGINT'));
    
    bot.on('close', (botCode) => {
      process.exit(botCode);
    });
    
  } else {
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Failed to run migrations:', error);
  process.exit(1);
});