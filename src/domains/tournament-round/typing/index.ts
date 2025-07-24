import type { Request } from 'express';
import type { DB_InsertTournamentRound, DB_SelectTournamentRound } from '../schema';

export type TournamentRoundRequest = Request<
  { tournamentId: string; roundSlug?: string },
  any,
  DB_InsertTournamentRound
>;

export type TournamentRoundBulkRequest = Request<
  { tournamentId: string },
  any,
  DB_InsertTournamentRound[]
>;

export type TournamentRoundResponse = {
  success: boolean;
  data?: DB_SelectTournamentRound | DB_SelectTournamentRound[];
  error?: string;
  code?: string;
};

export type TournamentRoundParams = {
  tournamentId: string;
  roundSlug: string;
};

export type TournamentRoundQuery = {
  type?: 'season' | 'knockout' | 'special-knockout';
  order?: string;
};