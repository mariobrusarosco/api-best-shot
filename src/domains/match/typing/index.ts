import { Request } from 'express';

export type CreateMatchesRequest = Request<null, CreateMatchesRequestInput>;

export interface CreateMatchesRequestInput {
  tournamentId: string;
}

export type UpdateMatchesForRoundRequest = Request<null, UpdateMatchesForRoundRequestInput>;

export interface UpdateMatchesForRoundRequestInput {
  tournamentId: string;
  roundSlug: string;
}
