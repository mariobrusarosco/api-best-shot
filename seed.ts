import db from './src/services/database';
import { T_Member } from './src/domains/member/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Starting seed...');

  try {
    // Create test member
    const hashedPassword = await bcrypt.hash('test123', 10);
    const now = new Date();
    
    const memberData = {
      id: uuidv4(),
      publicId: uuidv4(),
      email: 'sheldon@example.com',
      password: hashedPassword,
      firstName: 'Sheldon',
      lastName: 'Cooper',
      nickName: 'Sheldon',
      createdAt: now,
      updatedAt: now
    };

    const result = await db.insert(T_Member).values(memberData).returning();
    console.log('✅ Created test member:', result);

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