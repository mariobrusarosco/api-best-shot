import { T_TournamentPerformance } from "@/domains/performance/schema";
import db from "@/services/database";
import { API_TOURNAMENT } from '@/domains/tournament/api';
import { eq, sql } from 'drizzle-orm';
import { T_Tournament } from "@/domains/tournament/schema";

const selectMemberTournamentPerformance = async (memberId: string, tournamentId: string) => {
    const query = await db.query.T_TournamentPerformance.findFirst({
        where: (tournamentPerformance, {eq}) => 
            eq(tournamentPerformance.memberId, memberId) && 
            eq(tournamentPerformance.tournamentId, tournamentId)
    })

    return query;
}

const upsertMemberTournamentPerformance = async (memberId: string, tournamentId: string, points: string) => {
    return db
        .insert(T_TournamentPerformance)
        .values({
            memberId,
            tournamentId,
            points,
            updatedAt: new Date()
        })
        .onConflictDoUpdate({
            target: [T_TournamentPerformance.memberId, T_TournamentPerformance.tournamentId],
            set: { points, updatedAt: new Date() }
        });
};

const selectMemberPerformanceForAllTournaments = async (memberId: string) => {
    const query = await db.query.T_TournamentPerformance.findMany({
        where: (tournamentPerformance, {eq}) => eq(tournamentPerformance.memberId, memberId)
    })

    return query;
}

const queryPerformanceOfAllMemberTournaments = async (memberId: string) => {
    try {
      const query = await db
        .select()
        .from(T_TournamentPerformance)
        .innerJoin(T_Tournament, eq(T_TournamentPerformance.tournamentId, T_Tournament.id))
        .where(eq(T_TournamentPerformance.memberId, memberId)); 
    
        return query;
    } catch (error: any) {
      console.error('[DB_PERFORMANCE] - [queryPerformanceOfAllMemberTournaments] ', error);
      return [];
    }
  };

export const QUERIES_PERFORMANCE = {
    selectMemberTournamentPerformance,
    upsertMemberTournamentPerformance,
    selectMemberPerformanceForAllTournaments,
    queryPerformanceOfAllMemberTournaments
};