import { T_Member } from '@/domains/member/schema';
import db from '@/services/database';
import { eq } from 'drizzle-orm';

const getMemberByPublicId = async (publicId: string) => {
  const [member] = await db
    .select()
    .from(T_Member)
    .where(eq(T_Member.publicId, publicId));

  return member;
};

export const QUERIES_AUTH = {
  getMemberByPublicId,
};
