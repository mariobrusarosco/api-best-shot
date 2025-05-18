import { Request } from 'express';

export type TournamentRoundRequest = Request<null, CreateTournamentRoundInput>;

export type CreateTournamentRoundInput = {
  tournamentId: string;
};
