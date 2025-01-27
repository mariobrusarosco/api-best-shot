import { DB_SelectGuess } from "@/domains/guess/schema";
import { DB_SelectMatch } from "@/domains/match/schema";
import { QUERIES_Guess } from "@/domains/guess/queries";
import { QUERIES_Performance } from "../queries";
import { runGuessAnalysis } from "@/domains/guess/controllers/guess-analysis";

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
   
    await QUERIES_Performance.upsertMemberTournamentPerformance(memberId, tournamentId, points);
    return memberGuesses;
}

const getMemberTournamentPerformanceV2 = async (memberId: string, tournamentId: string) => {
    const guesses = await SERVICES_Performance.updateMemberGuessesForTournament(
        memberId,
        tournamentId
    );

    return {
        tournamentId,
        memberId,
        guesses,
        // Add any other fields needed in the response
    };
};

export const SERVICES_Performance = {
    updateMemberGuessesForTournament,
    getMemberTournamentPerformanceV2  // New V2 endpoint
};