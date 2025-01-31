import db from "@/services/database";
import { T_League, T_LeagueRole, T_LeagueTournament } from '@/domains/league/schema';
import { T_Member } from '@/domains/member/schema';
import { T_Tournament } from '@/domains/tournament/schema';
import { T_LeaguePerformance } from '@/domains/performance/schema';
import { and, eq, sql } from 'drizzle-orm';

const selectLeague = async (leagueId: string) => {
    const league = await db.query.T_League.findFirst({
        where: (league, { eq }) => eq(league.id, leagueId),
    });
    return league;
};

const getMemberLeagues = async (memberId: string) => {
    const leagues = await db
        .select({
            label: T_League.label,
            description: T_League.description,
            id: T_League.id,
        })
        .from(T_League)
        .innerJoin(T_LeagueRole, eq(T_League.id, T_LeagueRole.leagueId))
        .where(eq(T_LeagueRole.memberId, memberId));
    
    return leagues;
};

const createLeague = async (data: { label: string; description: string; founderId: string }) => {
    const [league] = await db
        .insert(T_League)
        .values({
            label: data.label,
            description: data.description,
            founderId: data.founderId,
        })
        .returning();
    
    return league;
};

const createLeagueRole = async (data: { leagueId: string; memberId: string; role: string }) => {
    const [role] = await db
        .insert(T_LeagueRole)
        .values(data)
        .returning();
    
    return role;
};

const createLeaguePerformance = async (data: { leagueId: string; memberId: string; points: string }) => {
    const [performance] = await db
        .insert(T_LeaguePerformance)
        .values(data)
        .returning();
    
    return performance;
};

const getMemberById = async (memberId: string) => {
    const [member] = await db
        .select()
        .from(T_Member)
        .where(eq(T_Member.id, memberId));
    
    return member;
};

const getLeagueDetails = async (leagueId: string) => {
    const mainQuery = await db
        .select()
        .from(T_LeagueRole)
        .innerJoin(T_League, eq(T_League.id, leagueId))
        .innerJoin(T_Member, eq(T_Member.id, T_LeagueRole.memberId))
        .where(and(eq(T_LeagueRole.leagueId, leagueId)));

    return mainQuery;
};

const getLeagueTournaments = async (leagueId: string) => {
    const tournaments = await db
        .select()
        .from(T_LeagueTournament)
        .leftJoin(T_Tournament, eq(T_LeagueTournament.tournamentId, T_Tournament.id))
        .where(
            and(
                eq(T_LeagueTournament.leagueId, leagueId),
                eq(T_LeagueTournament.status, 'tracked')
            )
        );
    
    return tournaments;
};

const updateLeagueTournaments = async (updateInput: { leagueId: string; tournamentId: string; status: string }[]) => {
    const result = await db
        .insert(T_LeagueTournament)
        .values(updateInput)
        .onConflictDoUpdate({
            target: [T_LeagueTournament.leagueId, T_LeagueTournament.tournamentId],
            set: {
                status: sql`excluded.status`,
            },
        })
        .returning();
    
    return result;
};

export const QUERIES_LEAGUE = {
    selectLeague,
    getMemberLeagues,
    createLeague,
    createLeagueRole,
    createLeaguePerformance,
    getMemberById,
    getLeagueDetails,
    getLeagueTournaments,
    updateLeagueTournaments
}; 