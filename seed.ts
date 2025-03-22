import db from './src/services/database';
import { T_Member } from './src/domains/member/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Starting seed...');

  try {
    // Create test member with password
    const hashedPassword = await bcrypt.hash('test123', 10);
    const now = new Date();
    
    const memberDataWithPassword = {
      id: uuidv4(),
      publicId: uuidv4(),
      email: 'sheldon@example.com',
      password: hashedPassword, // With password
      firstName: 'Sheldon',
      lastName: 'Cooper',
      nickName: 'Sheldon',
      createdAt: now,
      updatedAt: now
    };

    // Create test member without password
    const memberDataWithoutPassword = {
      id: uuidv4(),
      publicId: uuidv4(),
      email: 'leonard@example.com',
      // No password field (demonstrating it's optional)
      firstName: 'Leonard',
      lastName: 'Hofstadter',
      nickName: 'Leonard',
      createdAt: now,
      updatedAt: now
    };

    // Insert both members
    const resultWithPassword = await db.insert(T_Member).values(memberDataWithPassword).returning();
    console.log('✅ Created test member with password:', resultWithPassword);

    const resultWithoutPassword = await db.insert(T_Member).values(memberDataWithoutPassword).returning();
    console.log('✅ Created test member without password:', resultWithoutPassword);

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