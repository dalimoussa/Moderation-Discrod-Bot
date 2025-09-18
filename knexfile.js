"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config = {
    development: {
        client: 'postgresql',
        connection: {
            connectionString: process.env.DATABASE_URL || 'postgresql://kali:kali@localhost:5433/aegis_dev',
            ssl: false
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: './src/database/migrations',
            extension: 'ts'
        },
        seeds: {
            directory: './src/database/seeds',
            extension: 'ts'
        }
    },
    staging: {
        client: 'postgresql',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: './dist/database/migrations',
            extension: 'js'
        },
        seeds: {
            directory: './dist/database/seeds',
            extension: 'js'
        }
    },
    production: {
        client: 'postgresql',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        },
        pool: {
            min: 2,
            max: 20
        },
        migrations: {
            directory: './migrations',
            extension: 'js'
        },
        seeds: {
            directory: './seeds',
            extension: 'js'
        }
    }
};
module.exports = config;
