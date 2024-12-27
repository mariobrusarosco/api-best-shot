import { Request } from 'express';

export type TeamsRequest = Request<{ tournamentId: string }, null, null>;
