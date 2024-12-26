import { TournamentQueries } from '@/domains/tournament/queries';

const create = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (tournament === undefined) throw new Error('Tournament not found');

    console.log(
      '[LOG] - [TeamsController] - CREATING TOURNAMENT ROUNDS FOR: ',
      tournament.label
    );

    return [];
  } catch (error: any) {
    console.error('[ERROR] - [TeamsController] - CREATE TEAMS', error);
  }
};

const update = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (tournament === undefined) throw new Error('Tournament not found');

    return [];
  } catch (error: any) {
    console.error('[ERROR] - [TeamsController] - UPDATE TEAMS', error);
  }
};

export const TeamsController = {
  create,
  update,
};
