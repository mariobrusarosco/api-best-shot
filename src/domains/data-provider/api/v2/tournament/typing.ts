import { Request } from 'express';

export type TournamentRequest = Request<null, CreateTournamentInput>;

export type CreateTournamentInput = {
  tournamentPublicId: string;
  baseUrl: string;
  slug: string;
  provider: string;
  season: string;
  mode: 'regular-season-only' | 'regular-season-and-knockout' | 'knockout-only';
  label: string;
  logoUrl?: string;
  logoPngBase64?: string;
  standingsMode: 'unique-group' | 'multi-group';
};

type UpdateTournamentInput = CreateTournamentInput;
