import { T_Member } from '@/services/database/schema';
import { eq } from 'drizzle-orm';

import db from '@/services/database';
import { CreateMemberInput } from '../api/typing';

const getMember = async (memberId: string) => {
  const [member] = await db.select().from(T_Member).where(eq(T_Member.id, memberId));

  return member;
};

const createMember = async (input: CreateMemberInput) => {
  return db.insert(T_Member).values(input).returning();
};

const getMembersByRole = async (role: 'member' | 'admin') => {
  return db.select().from(T_Member).where(eq(T_Member.role, role));
};

export const QUERIES_MEMBER = {
  getMember,
  createMember,
  getMembersByRole,
};
