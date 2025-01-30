import { T_Guess } from "@/services/database/schema";
import { T_LeagueRole, T_Match, T_Member, T_Tournament } from "@/services/database/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import Profiling from "@/services/profiling";

import db from "@/services/database";

async function getLeagueScore(leagueId: string) {
    try {
      return db
        .select()
        .from(T_Guess)
        .leftJoin(T_LeagueRole, eq(T_Guess.memberId, T_LeagueRole.memberId))
        .leftJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
        .leftJoin(T_Member, eq(T_Member.id, T_Guess.memberId))
        .leftJoin(T_Tournament, eq(T_Tournament.id, T_Match.tournamentId))
        .where(
          and(
            eq(T_LeagueRole.leagueId, leagueId),
            gte(T_Match.date, new Date('2024-01-01')),
            lte(T_Match.date, new Date('2025-07-31'))
          )
        )
    } catch (error: any) {
      Profiling.error(error, '[QUERIES_SCORE] - GET_LEAGUE_SCORE');
      throw error;
    }
  }

export const QUERIES_SCORE = {
    getLeagueScore
}; 