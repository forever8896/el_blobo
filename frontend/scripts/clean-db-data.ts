/**
 * Clean Database Data Script
 *
 * Removes all data from tables while preserving table structures
 * Run with: npx tsx scripts/clean-db-data.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function cleanDatabase() {
  // Check if we need SSL based on the connection string
  const needsSSL = process.env.POSTGRES_URL?.includes('sslmode=require') ||
                   process.env.POSTGRES_URL?.includes('.neon.tech') ||
                   process.env.POSTGRES_URL?.includes('.vercel');

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: needsSSL ? {
      rejectUnauthorized: false,
    } : false,
  });

  try {
    console.log('🧹 Starting database cleanup...\n');

    // Clean all tables (CASCADE will handle foreign key dependencies)
    const tables = [
      'chat_messages',
      'council_votes',
      'projects',
      'referrals',
      'users' // Users last because other tables reference it
    ];

    for (const table of tables) {
      const result = await pool.query(`
        DELETE FROM ${table};
      `);
      console.log(`✅ Cleared ${table}: ${result.rowCount} rows deleted`);
    }

    // Verify all tables are empty
    console.log('\n📊 Verifying cleanup...');
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   ${table}: ${result.rows[0].count} rows remaining`);
    }

    console.log('\n✨ Database cleanup complete!');
    console.log('   All data has been removed while preserving table structures.');

  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the cleanup
cleanDatabase().catch((error) => {
  console.error('Failed to clean database:', error);
  process.exit(1);
});
