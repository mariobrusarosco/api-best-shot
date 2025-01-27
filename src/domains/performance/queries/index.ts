import { T_TournamentPerformance } from "@/domains/performance/schema";
import db from "@/services/database";
import { API_TOURNAMENT } from '@/domains/tournament/api';

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

export const QUERIES_Performance = {
    selectMemberTournamentPerformance,
    upsertMemberTournamentPerformance
};
