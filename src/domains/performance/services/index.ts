import { DB_SelectGuess } from "@/domains/guess/schema";
import { DB_SelectMatch } from "@/domains/match/schema";
import { QUERIES_Guess, QUERIES_GUESS_V2 } from "@/domains/guess/queries";
import { QUERIES_PERFORMANCE } from "../queries";
import { runGuessAnalysis } from "@/domains/guess/controllers/guess-analysis";
import _ from 'lodash';
import { handleInternalServerErrorResponse } from "@/domains/shared/error-handling/httpResponsesHelper";
import db from "@/services/database";
import { T_TournamentPerformance } from "@/services/database/schema";
import { SERVICES_GUESS_V2 } from '@/domains/guess/services';
import { runGuessAnalysis_V2 } from "@/domains/guess/services/guess-analysis-v2";
import { and, eq } from "drizzle-orm";
import { QUERIES_LEAGUE } from "@/domains/league/queries";

interface GuessWithMatch {
    guess: DB_SelectGuess;
    match: DB_SelectMatch;
}

const calculatePoints = (guesses: GuessWithMatch[]): string => {
    const parsedGuesses = guesses.map(row => runGuessAnalysis(row.guess, row.match));
    const totalPoints = parsedGuesses.reduce((sum, guess) => sum + (guess.total || 0), 0);
    return totalPoints.toString(); // Convert to string as required by the schema
};

const updateMemberGuessesForTournament = async (memberId: string, tournamentId: string): Promise<GuessWithMatch[]> => {
    const memberGuesses = await QUERIES_Guess.selectMemberGuessesForTournament(memberId, tournamentId);
    
    const points = calculatePoints(memberGuesses);
   
    await QUERIES_PERFORMANCE.upsertMemberTournamentPerformance(memberId, tournamentId, points);
    return memberGuesses;
}

const getMemberPerformance = async (memberId: string, tournamentId: string) => {
        try {
          const guesses = await QUERIES_GUESS_V2.selectMemberGuessesForTournament(tournamentId, memberId);
          const parsedGuesses = SERVICES_GUESS_V2.runGuessAnalysis_V2(guesses) 
          const [performance] = await db
            .select()
            .from(T_TournamentPerformance)
            .where(
              and(
                eq(T_TournamentPerformance.memberId, memberId),
                eq(T_TournamentPerformance.tournamentId, tournamentId)
              )
            );

          return {
            details: parsedGuesses,
            points: performance.points,
            lastUpdated: performance.updatedAt,
          }
        } catch (error: any) {
          console.error('[GET] - [GUESS]', error);
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

const updatePerformance = async (leagueId: string) => {
    const league = await QUERIES_LEAGUE.selectLeague(leagueId);
    
    if (!league) {
        return { error: 'League not found' };
    }
    
}

export const SERVICES_Performance = {
    updateMemberGuessesForTournament,
    getMemberPerformance
};


export const SERVICES_PERFORMANCE_V2 = {
    tournaments: {
        getMemberPerformance,
        getMemberBestAndWorstPerformance
    },
    league: {
        getMemberPerformance,
        updatePerformance
    }
};  