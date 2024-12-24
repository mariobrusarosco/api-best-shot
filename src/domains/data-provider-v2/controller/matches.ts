// @ts-nocheck

import { T_Match } from '@/domains/match/schema';
import { TournamentQueries } from '@/domains/tournament/queries';
import {
  DB_SelectTournament,
  DB_SelectTournamentRound,
} from '@/domains/tournament/schema';
import db from '@/services/database';
import { eq } from 'drizzle-orm';
import { SofascoreMatches } from '../providers/sofascore/sofascore-matches';

// const setupMatches = async (tournamentId: string) => {
//   try {
//     const result = await createMatchesForEachRound(tournament);

//     return res.status(200).send(result);
//   } catch (error: any) {
//     console.error('[ERROR] - setupMatches for tournament:', tournamentId);
//     console.error('[URL] - ', error.config.url);
//     console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);
//   }
// };

const updateMatchesOfRound = async (tournament: DB_SelectTournament, roundId: number) => {
  const fetchedMatches = await SofascoreMatches.fetchRoundMatches(
    tournament.baseUrl,
    roundId
  );
  const mappedMatches = SofascoreMatches.mapRoundMatches(
    fetchedMatches,
    String(roundId),
    String(tournament.id)
  );

  await db.transaction(async tx => {
    for (const match of mappedMatches) {
      await tx.update(T_Match).set(match).where(eq(T_Match.externalId, match.externalId));
    }
  });
};

const createMatchesOfRound = async (
  tournamentId: string,
  round: DB_SelectTournamentRound
) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    console.log('round', round);

    // Fetch round

    // const fetchedMatches = await SofascoreMatches.fetchRoundMatches(
    //   tournament.id!,
    //   roundId || '1'
    // );
    // const parsedMatches = SofascoreMatches.mapRoundMatches(
    //   fetchedMatches,
    //   roundId,
    //   tournament.id!
    // );

    return [];
  } catch (error: any) {
    console.error('[ERROR] - createMatchesOfRound for tournament:', tournamentId);
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);
  }
};

export const MatchesController = {
  // setupMatches,
  // updateMatchesOfRound,
  createMatchesOfRound,
};
