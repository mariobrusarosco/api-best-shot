import { BrowserAssetTransportError } from '@/domains/data-provider-v2/transport/playwright/browser-asset-uploader';
import type { DB_SelectTournament } from '@/domains/tournament/schema';

const VALID_TOURNAMENT_MODES = ['regular-season-and-knockout', 'regular-season-only', 'knockout-only'] as const;
const VALID_STANDINGS_MODES = ['unique-group', 'multi-group'] as const;

export type TournamentWorkflowInputShape = {
  tournamentPublicId: string;
  baseUrl: string;
  publicUrl: string;
  slug: string;
  provider: 'sofascore';
  season: string;
  mode: DB_SelectTournament['mode'];
  label: string;
  standingsMode: DB_SelectTournament['standingsMode'];
};

export type TournamentWorkflowInvalidInput = {
  field: keyof TournamentWorkflowInputShape;
  errorMessage: string;
};

export type TournamentWorkflowFailure = {
  requestUrl?: string;
  errorMessage: string;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export const normalizeTournamentWorkflowInput = <TInput extends TournamentWorkflowInputShape>(
  tournament: TInput
): TInput => {
  return {
    ...tournament,
    tournamentPublicId: tournament.tournamentPublicId.trim(),
    baseUrl: tournament.baseUrl.trim(),
    publicUrl: tournament.publicUrl.trim(),
    slug: tournament.slug.trim(),
    season: tournament.season.trim(),
    label: tournament.label.trim(),
  };
};

export const validateTournamentWorkflowInput = (
  tournament: TournamentWorkflowInputShape
): TournamentWorkflowInvalidInput[] => {
  const invalidInput: TournamentWorkflowInvalidInput[] = [];

  if (!tournament.tournamentPublicId) {
    invalidInput.push(createInvalidInput('tournamentPublicId', 'Tournament public ID is required'));
  }

  if (!tournament.baseUrl) {
    invalidInput.push(createInvalidInput('baseUrl', 'Tournament baseUrl is required'));
  }

  if (!tournament.publicUrl) {
    invalidInput.push(createInvalidInput('publicUrl', 'Tournament publicUrl is required'));
  }

  if (!tournament.slug) {
    invalidInput.push(createInvalidInput('slug', 'Tournament slug is required'));
  }

  if (tournament.provider !== 'sofascore') {
    invalidInput.push(createInvalidInput('provider', 'Tournament provider must be "sofascore"'));
  }

  if (!tournament.season) {
    invalidInput.push(createInvalidInput('season', 'Tournament season is required'));
  }

  if (!VALID_TOURNAMENT_MODES.includes(tournament.mode)) {
    invalidInput.push(createInvalidInput('mode', 'Tournament mode is invalid'));
  }

  if (!tournament.label) {
    invalidInput.push(createInvalidInput('label', 'Tournament label is required'));
  }

  if (!VALID_STANDINGS_MODES.includes(tournament.standingsMode)) {
    invalidInput.push(createInvalidInput('standingsMode', 'Tournament standingsMode is invalid'));
  }

  return invalidInput;
};

export const buildSofaScoreTournamentLogoUrl = (tournamentPublicId: string): string => {
  if (!tournamentPublicId.trim()) {
    throw new Error('tournamentPublicId is required to build the SofaScore tournament logo URL');
  }

  return `https://img.sofascore.com/api/v1/unique-tournament/${tournamentPublicId}/image`;
};

export const buildTournamentWorkflowFailure = (error: unknown): TournamentWorkflowFailure => {
  if (error instanceof BrowserAssetTransportError) {
    return {
      requestUrl: error.requestUrl,
      errorMessage: error.message,
      causeMessage: error.causeMessage,
    };
  }

  return {
    errorMessage: error instanceof Error ? error.message : String(error),
  };
};

const createInvalidInput = (
  field: keyof TournamentWorkflowInputShape,
  errorMessage: string
): TournamentWorkflowInvalidInput => {
  return {
    field,
    errorMessage,
  };
};
