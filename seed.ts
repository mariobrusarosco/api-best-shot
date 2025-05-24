import db from './src/services/database';
import { T_Member } from './src/domains/member/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Starting seed...');

  try {
    // Create test member with password
    const hashedPassword = await bcrypt.hash('test123', 10);
    const now = new Date();

    // Create a unique publicId for Google OAuth
    const testMemberWithOAuth = {
      id: uuidv4(),
      publicId: 'google-oauth2|102617786899713612616',
      email: 'mariobrusarosco@gmail.com',
      firstName: 'Mario',
      lastName: 'Brusarosco de Almeida',
      nickName: 'mariobrusarosco',
      createdAt: now,
      updatedAt: now,
    };

    // Create test member with password
    const testMemberWithPassword = {
      id: uuidv4(),
      publicId: uuidv4(),
      email: 'test@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      nickName: 'TestUser',
      createdAt: now,
      updatedAt: now,
    };

    // Insert members
    const resultOAuth = await db.insert(T_Member).values(testMemberWithOAuth).returning();
    console.log('✅ Created OAuth member:', resultOAuth[0].email);

    const resultPassword = await db
      .insert(T_Member)
      .values(testMemberWithPassword)
      .returning();
    console.log('✅ Created member with password:', resultPassword[0].email);

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
