import { Request } from 'express';

export type MatchesRequest = Request<{ tournamentId: string }, null, null>;

export type MatchesForRoundRequest = Request<
  { tournamentId: string; roundSlug: string },
  null,
  null
>;
