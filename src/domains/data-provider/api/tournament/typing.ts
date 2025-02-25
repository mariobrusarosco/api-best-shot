import { Request } from 'express';

export type TournamentRequest = Request<null, CreateTournamentInput>;

export type CreateTournamentInput = {
  externalId: string;
  baseUrl: string;
  slug: string;
  provider: string;
  season: string;
  mode: 'regular-season-only' | 'regular-season-and-knockout' | 'knockout-only';
  label: string;
  logoUrl?: string;
  logoPngBase64?: string;
};

type UpdateTournamentInput = CreateTournamentInput;
