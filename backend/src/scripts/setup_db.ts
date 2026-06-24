import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const targetDbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/datapulse';
const dbName = new URL(targetDbUrl).pathname.slice(1);

async function setup() {
  // 1. Connect to the target DB and run schema/seed
  const appClient = new Client({ 
    connectionString: targetDbUrl,
    ssl: targetDbUrl.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
  });
  try {
    await appClient.connect();
    console.log(`Connected to ${dbName}. Running schema...`);
    
    const schemaPath = path.join(__dirname, '../../../db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await appClient.query(schemaSql);
    console.log('Schema executed successfully.');

    console.log('Running seed script...');
    const seedPath = path.join(__dirname, '../../../db/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await appClient.query(seedSql);
    console.log('Seed executed successfully.');

  } catch (error) {
    console.error('Error running schema/seed:', error);
    process.exit(1);
  } finally {
    await appClient.end();
  }
}

setup();
