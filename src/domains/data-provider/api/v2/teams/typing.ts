import { Request } from 'express';

export type TeamsRequest = Request<null, CreateTeamsInput>;

export type CreateTeamsInput = {
  tournamentId: string;
};
