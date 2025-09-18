#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Aegis Discord Bot with database migration...');

// Run migrations first
console.log('📊 Running database migrations...');
const migrate = spawn('node', ['node_modules/knex/bin/cli.js', 'migrate:latest'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

migrate.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Database migrations completed successfully');
    
    // Start the bot
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
    console.error('❌ Database migration failed with code:', code);
    process.exit(1);
  }
});

migrate.on('error', (err) => {
  console.error('❌ Failed to start migration process:', err);
  process.exit(1);
});