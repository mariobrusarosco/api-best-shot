import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '../../services/database/schema';
// For now, we're only seeding members as requested
import { members } from './members';

// This structure allows for future expansion with more seeders
const seeders = [
  { name: 'members', fn: members },
  // Add more seeders as needed in the future:
  // { name: 'tournaments', fn: tournaments },
  // { name: 'tournamentRounds', fn: tournamentRounds },
];

// Using any type to avoid TypeScript errors with database schema mismatches
export async function seedDatabase(db: PostgresJsDatabase<typeof schema>) {
  console.log('🌱 Starting database seeding...');

  try {
    // Attempt a simple query to verify the database connection
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection verified.');
  } catch (connectionError) {
    console.error(
      '❌ Failed to connect to the database. Aborting seeding process.',
      connectionError
    );
    // Re-throw the error to be caught by the calling script (run-seeds.ts) and exit
    throw connectionError;
  }

  for (const seeder of seeders) {
    try {
      console.log(`📊 Seeding ${seeder.name}...`);
      await seeder.fn(db);
      console.log(`✅ ${seeder.name} seeded successfully`);
    } catch (error) {
      console.error(`❌ Error seeding ${seeder.name}:`, error);
      throw error;
    }
  }

  console.log('✨ Database seeding completed successfully!');
}
