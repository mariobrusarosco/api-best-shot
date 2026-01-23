import { T_Member } from '@/domains/member/schema';
import db from '@/services/database';

import { eq } from 'drizzle-orm';
import { CreateMemberInput } from '../api/typing';
import { MemberRole } from '../schema';

const getMemberById = async (memberId: string) => {
  const [member] = await db
    .select({
      nickName: T_Member.nickName,
      firstName: T_Member.firstName,
      lastName: T_Member.lastName,
      email: T_Member.email,
      role: T_Member.role,
    })
    .from(T_Member)
    .where(eq(T_Member.id, memberId));

  return member;
};

const createMember = async (input: CreateMemberInput) => {
  const [member] = await db.insert(T_Member).values(input).returning();
  return member;
};

const isMemberAdmin = async (memberId: string): Promise<boolean> => {
  const [member] = await db.select({ role: T_Member.role }).from(T_Member).where(eq(T_Member.id, memberId));

  return member?.role === 'admin';
};

const requireAdminRole = async (memberId: string): Promise<void> => {
  const isAdmin = await isMemberAdmin(memberId);
  if (!isAdmin) {
    throw new Error('Admin role required');
  }
};

const updateMemberRole = async (memberId: string, role: MemberRole) => {
  const [updatedMember] = await db
    .update(T_Member)
    .set({ role, updatedAt: new Date() })
    .where(eq(T_Member.id, memberId))
    .returning();

  return updatedMember;
};

export const MemberService = {
  getMemberById,
  createMember,

  isMemberAdmin,
  requireAdminRole,
  updateMemberRole,
};
