import { Request } from 'express';

export type CreateMatchesRequest = Request<null, CreateMatchesRequestInput>;

export interface CreateMatchesRequestInput {
  tournamentId: string;
}

export const MATCH_STATUSES = {
  IN_PROGRESS: 'in-progress',
  NOT_STARTED: 'notstarted',
  ENDED: 'ended',
  POSTPONED: 'postponed',
} as const;

export type IMatchStatus = (typeof MATCH_STATUSES)[keyof typeof MATCH_STATUSES];

export type UpdateMatchesForRoundRequest = Request<null, UpdateMatchesForRoundRequestInput>;

export interface UpdateMatchesForRoundRequestInput {
  tournamentId: string;
  roundSlug: string;
}
