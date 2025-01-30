import {
  DB_SelectLeaguePerformance,
  DB_SelectTournamentPerformance,
} from '@/domains/performance/schema';
import { CreateMemberInput } from '../api/typing';
import { QUERIES_MEMBER } from '../queries';
import Profiling from '@/services/profiling';
import { DB_SelectTournament } from '@/domains/tournament/schema';

const getMember = async (memberId: string) => {
  try {
    return QUERIES_MEMBER.getMember(memberId);
  } catch (error: any) {
    Profiling.error('[ERROR] [QUERIES_MEMBER]', error);

    return null;
  }
};

const createMember = async (input: CreateMemberInput) => {
  try {
    return QUERIES_MEMBER.createMember(input);
  } catch (error: any) {
    Profiling.error('[ERROR] [QUERIES_MEMBER]', error);

    return null;
  }
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



export const SERVICES_MEMBER = {
    getMember,
    createMember,
    getBestAndWorstPerformance,
}