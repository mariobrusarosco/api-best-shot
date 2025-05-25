import db from './src/services/database';
import { seedDatabase } from './src/db/seeds';

// For backward compatibility - keep old imports
import { T_Member } from './src/domains/member/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Starting seed...');

  try {
    // Use the new seeding system
    await seedDatabase(db);

    console.log('✨ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
