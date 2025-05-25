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
export async function seedDatabase(db: unknown) {
  console.log('🌱 Starting database seeding...');

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
