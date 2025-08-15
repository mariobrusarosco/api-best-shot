import { T_Member } from '@/domains/member/schema';
import {
  DB_SelectLeaguePerformance,
  DB_SelectTournamentPerformance,
} from '@/domains/performance/schema';
import { DB_SelectTournament } from '@/domains/tournament/schema';
import { SERVICES_PERFORMANCE_V2 } from '@/domains/performance/services';
import { QUERIES_PERFORMANCE } from '@/domains/performance/queries';
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

const getGeneralTournamentPerformance = async (memberId: string) => {
  return await QUERIES_PERFORMANCE.tournament.getMemberGeneralPerformance(memberId);
};

const getGeneralTournamentPerformanceV2 = async (memberId: string) => {
  // First update the performance
  await SERVICES_PERFORMANCE_V2.tournament.updateGeneralPerformance(memberId);

  // Then fetch the updated data
  const tournamentPerformance =
    await SERVICES_PERFORMANCE_V2.tournament.getMemberBestAndWorstPerformance(memberId);

  return {
    tournaments: tournamentPerformance,
  };
};

const getBestAndWorstPerformance = (
  performance:
    | DB_SelectLeaguePerformance[]
    | {
        tournament_performance: DB_SelectTournamentPerformance;
        tournament: DB_SelectTournament | null;
      }[]
) => {
  const best = performance?.at(0);
  const worst = performance.at(-1);

  return { best, worst };
};

const isMemberAdmin = async (memberId: string): Promise<boolean> => {
  const [member] = await db
    .select({ role: T_Member.role })
    .from(T_Member)
    .where(eq(T_Member.id, memberId));

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
  getBestAndWorstPerformance,
  getGeneralTournamentPerformance,
  getGeneralTournamentPerformanceV2,
  isMemberAdmin,
  requireAdminRole,
  updateMemberRole,
};
