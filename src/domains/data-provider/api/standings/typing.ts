import { Request } from 'express';

export type StandingsRequest = Request<{ tournamentId: string }, null, null>;
