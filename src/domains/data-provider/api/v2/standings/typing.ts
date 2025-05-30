import { Request } from 'express';

export type StandingsRequest = Request<null, CreateStandingsInput>;

export type CreateStandingsInput = {
  tournamentId: string;
};
