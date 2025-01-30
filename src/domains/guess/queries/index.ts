import db from "@/services/database";
import { T_Guess } from "@/domains/guess/schema";
import { T_Match } from "@/domains/match/schema";
import { eq, and } from "drizzle-orm";

const selectMemberGuessesForTournament = async (memberId: string, tournamentId: string) => {
    // console.log({ memberId, tournamentId });
    const guesses = await db
        .select()
        .from(T_Guess)
        .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
        .where(
            and(
                eq(T_Match.tournamentId, tournamentId),
                eq(T_Guess.memberId, memberId)
            )
        ).orderBy(T_Match.date);

    console.log({ guesses });

    return guesses;
}


export const QUERIES_GUESS = {
    selectMemberGuessesForTournament
};
