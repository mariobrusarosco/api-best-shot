import db from '../src/services/database';
import { T_Member } from '../src/domains/member/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function main() {
  try {
    // 1. Truncate the member table
    await db.delete(T_Member);
    console.log('🧹 Member table truncated.');

    // 2. Prepare the four members
    const now = new Date();
    const hashedPassword = await bcrypt.hash('test123', 10);
    const members = [
      {
        id: uuidv4(),
        publicId: 'google-oauth2|102617786899713612616',
        email: 'mariobrusarosco@gmail.com',
        firstName: 'Mario',
        lastName: 'Brusarosco de Almeida',
        nickName: 'mariobrusarosco',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        publicId: uuidv4(),
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        nickName: 'TestUser',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        publicId: uuidv4(),
        email: 'john.doe@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        nickName: 'JohnD',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        publicId: uuidv4(),
        email: 'jane.smith@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        nickName: 'JaneS',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 3. Insert the members
    await db.insert(T_Member).values(members);
    console.log('🌱 Seeded 4 members.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

main();
