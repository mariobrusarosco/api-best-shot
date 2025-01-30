import { DB_SelectGuess } from "@/domains/guess/schema";
import { DB_SelectMatch } from "@/domains/match/schema";
import { QUERIES_GUESS } from "@/domains/guess/queries";
import { QUERIES_PERFORMANCE } from "../queries";
import { runGuessAnalysis } from "@/domains/guess/controllers/guess-analysis";
import _  from 'lodash';
import db from "@/services/database";
import { T_LeaguePerformance, T_LeagueRole, T_LeagueTournament, T_Member } from "@/services/database/schema";
import { SERVICES_GUESS_V2 } from '@/domains/guess/services';
import Profiling from "@/services/profiling";
import { and, eq } from "drizzle-orm";
import { queryMemberTournamentGuesses } from "../controller";
import { DB_Performance } from "../database";

interface GuessWithMatch {
    guess: DB_SelectGuess;
    match: DB_SelectMatch;
}

const calculatePoints = (guesses: GuessWithMatch[]): string => {
  const parsedGuesses = guesses.map(row => runGuessAnalysis(row.guess, row.match));
  const totalPoints = SERVICES_GUESS_V2.getTotalPointsFromTournamentGuesses(parsedGuesses); 
  
  return  totalPoints?.toString() ?? '0';
};

const updateMemberGuessesForTournament = async (memberId: string, tournamentId: string): Promise<GuessWithMatch[]> => {
  const memberGuesses = await QUERIES_GUESS.selectMemberGuessesForTournament(memberId, tournamentId);
  const points = calculatePoints(memberGuesses);
  await QUERIES_PERFORMANCE.upsertMemberTournamentPerformance(memberId, tournamentId, points);
  
  return memberGuesses;
}

const getMemberPerformance = async (memberId: string, tournamentId: string) => {
  try {
    const guesses = await QUERIES_GUESS.selectMemberGuessesForTournament(tournamentId, memberId);
    const parsedGuesses = SERVICES_GUESS_V2.runGuessAnalysis_V2(guesses) 
    const performance = await QUERIES_PERFORMANCE.tournament.getMemberPerformance(memberId, tournamentId);

    return {
      details: parsedGuesses,
      points: performance.points,
      lastUpdated: performance.updatedAt,
    }

  } catch (error: any) {
    Profiling.error(error, '[SERVICES_PERFORMANCE] - GET_MEMBER_PERFORMANCE');
  }
};

const getMemberBestAndWorstPerformance = async (memberId: string) => {
    const tournamentPerformance = await QUERIES_PERFORMANCE.queryPerformanceOfAllMemberTournaments(memberId);
    if (!tournamentPerformance.length) {
        return { worstPerformance: null, bestPerformance: null };
    }

    const mapped = tournamentPerformance.map(row => ({
        points: Number(row.tournament_performance.points),
        label: row.tournament.label,
        id: row.tournament.id,
        logo: row.tournament.logo,
    }));
    
    const worstPerformance = _.minBy(mapped, p => Number(p.points));    
    const bestPerformance = _.maxBy(mapped, p => Number(p.points));
    
    return { tournaments: { worstPerformance, bestPerformance } };
};


const updateMemberPerformance = async (memberId: string, tournamentId: string) => {
  const guesses = await QUERIES_GUESS.selectMemberGuessesForTournament(memberId, tournamentId);
  const parsedGuesses = SERVICES_GUESS_V2.runGuessAnalysis_V2(guesses)
  const points = SERVICES_GUESS_V2.getTotalPointsFromTournamentGuesses(parsedGuesses);
  const updatedPerformance = await QUERIES_PERFORMANCE.tournament.updateMemberPerformance(points, memberId, tournamentId);  
  const parsedUpdatedPerformance = parsePerformance(updatedPerformance);
  
  return parsedUpdatedPerformance;
}

const parsePerformance = (performance: Awaited<ReturnType<typeof QUERIES_PERFORMANCE.tournament.updateMemberPerformance>>) => {
  return {
    ...performance,
    points: parseInt(performance.points ?? '0')
  };
}



export const updateTournamentsForMember = async (
  memberId: string,
  tournaments: { id: string }[]
) => {
  const promises = tournaments.map(async tournament => {
    // QUery
    const parsedGuesses = await queryMemberTournamentGuesses(memberId, tournament.id);
    console.log('parsedGuesses --------- ', memberId, tournament.id);

    // Update
    const [updated] = await DB_Performance.updateTournamentPerformanceOnDatabase(
      memberId,
      tournament.id,
      parsedGuesses
    );
    // console.log('updated --------- ', updated);
    return updated;
  });

  const updateResult = await Promise.all(promises);

  return updateResult;
};


const updateLeaguePerformance = async (leagueId: string) => {
  try {
    const leagueMembers = await db
      .select({
        memberId: T_LeagueRole.memberId,
        leagueId: T_LeagueRole.leagueId,
        memberName: T_Member.nickName,
      })
      .from(T_LeagueRole)
      .innerJoin(T_Member, eq(T_Member.id, T_LeagueRole.memberId))
      .where(eq(T_LeagueRole.leagueId, leagueId));

    const leagueTournaments = await db
      .select({ id: T_LeagueTournament.tournamentId })
      .from(T_LeagueTournament)
      .where(
        and(
          eq(T_LeagueTournament.leagueId, leagueId),
          eq(T_LeagueTournament.status, 'tracked')
        )
      );

    const promises = leagueMembers.map(async leagueMember => {
      console.log('UPDATE LEAGUE PERF FOR MEMBER', leagueMember.memberId);
      console.log('UPDATE TOURN PERFORMANCE FOR TOURNAMENTS', leagueTournaments);

      const updatedData = await updateTournamentsForMember(
        leagueMember.memberId,
        leagueTournaments
      );

      const totalPoints = updatedData.reduce(
        (points, performance) => (points += Number(performance?.points || 0)),
        0
      );
      const [query] = await db
        .update(T_LeaguePerformance)
        .set({
          leagueId: leagueId,
          memberId: leagueMember.memberId,
          points: String(totalPoints),
        })
        .where(
          and(
            eq(T_LeaguePerformance.memberId, leagueMember.memberId),
            eq(T_LeaguePerformance.leagueId, leagueMember.leagueId)
          )
        ).returning();

      return {
        memberName: leagueMember.memberName,
        points: parseInt(query.points ?? '0'),
        lastUpdated: query.updatedAt,
      };
    });

    const result = await Promise.all(promises);
    console.log('promises -', promises, 'result',_.orderBy(result, 'points', ['desc']));
    return {leaderBoard: _.orderBy(result, 'points', ['desc']) };
  } catch (error: any) {
    console.error('[ERROR] - updateLeaguePerformance', error);
  }
};


export const SERVICES_Performance = {
    updateMemberGuessesForTournament,
    getMemberPerformance
};


export const SERVICES_PERFORMANCE_V2 = {
    tournament: {
        getMemberPerformance,
        getMemberBestAndWorstPerformance,
        updateMemberPerformance
    },
    league: {
        getMemberPerformance,
        updateLeaguePerformance
    },
    parsers: {
      parsePerformance
    }
};  