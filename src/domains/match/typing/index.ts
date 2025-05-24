import { Request } from 'express';

export type CreateMatchesRequest = Request<null, CreateMatchesRequestInput>;

export interface CreateMatchesRequestInput {
  tournamentId: string;
}
