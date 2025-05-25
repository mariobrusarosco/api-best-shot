// Using any type for database to avoid TypeScript errors with schema mismatches
import { eq } from 'drizzle-orm';
import { T_Member } from '../../domains/member/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function members(db: any) {
  const now = new Date();
  const hashedPassword = await bcrypt.hash('test123', 10);

  const seedMembers = [
    // Admin user with OAuth
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
    // Test user with password
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
    // Additional demo users
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

  // Insert members one by one to handle errors individually
  for (const member of seedMembers) {
    try {
      // Check if member already exists to make seeding idempotent
      const existingMember = await db
        .select()
        .from(T_Member)
        .where(eq(T_Member.email, member.email))
        .limit(1);

      if (existingMember.length === 0) {
        const result = await db.insert(T_Member).values(member).returning();
        console.log(`  ✓ Created member: ${result[0].email}`);
      } else {
        console.log(`  ℹ Member already exists: ${member.email}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to create member ${member.email}:`, error);
      // Continue with other members even if one fails
    }
  }
}
