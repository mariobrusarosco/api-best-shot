import db from '../src/services/database';
import { seedDatabase } from '../src/db/seeds';

// Simple script to run the seedDatabase function
async function main() {
  try {
    await seedDatabase(db);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

main();
