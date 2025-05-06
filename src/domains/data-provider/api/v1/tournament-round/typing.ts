import { Request } from 'express';

export type TournamentRoundRequest = Request<{ tournamentId: string }, null, null>;
