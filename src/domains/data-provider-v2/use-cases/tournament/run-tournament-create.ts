import type {
  TournamentCreateFailure,
  TournamentCreateInput,
  TournamentCreateInvalidInput,
  TournamentCreateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/tournament-create';
import { insertTournament } from '@/domains/data-provider-v2/persistence/tournament/insert-tournament';
import {
  BrowserAssetTransportError,
  type BrowserAssetUploader,
} from '@/domains/data-provider-v2/transport/playwright/browser-asset-uploader';

const VALID_TOURNAMENT_MODES = ['regular-season-and-knockout', 'regular-season-only', 'knockout-only'] as const;
const VALID_STANDINGS_MODES = ['unique-group', 'multi-group'] as const;

export const runTournamentCreate = async (input: {
  tournament: TournamentCreateInput;
  logoUploader: BrowserAssetUploader;
}): Promise<TournamentCreateWorkflowResult> => {
  const normalizedTournament = normalizeTournamentCreateInput(input.tournament);
  const invalidInput = validateTournamentCreateInput(normalizedTournament);

  if (invalidInput.length > 0) {
    return {
      outcome: 'invalid_input',
      tournament: normalizedTournament,
      invalidInput,
    };
  }

  let uploadedLogo = null;
  const providerLogoUrl = buildSofaScoreTournamentLogoUrl(normalizedTournament.tournamentPublicId);

  try {
    uploadedLogo = await input.logoUploader.upload({
      providerLogoUrl,
      filename: `tournament-${normalizedTournament.tournamentPublicId}`,
    });
  } catch (error) {
    return {
      outcome: 'logo_upload_failed',
      tournament: normalizedTournament,
      logoUploadFailure: buildFailure(error),
    };
  }

  try {
    const createdTournament = await insertTournament({
      tournament: {
        externalId: normalizedTournament.tournamentPublicId,
        baseUrl: normalizedTournament.baseUrl,
        publicUrl: normalizedTournament.publicUrl,
        slug: normalizedTournament.slug,
        provider: normalizedTournament.provider,
        season: normalizedTournament.season,
        mode: normalizedTournament.mode,
        label: normalizedTournament.label,
        logo: uploadedLogo.assetUrl ?? '',
        standingsMode: normalizedTournament.standingsMode,
      },
    });

    return {
      outcome: 'created',
      tournament: normalizedTournament,
      uploadedLogo,
      createdTournament,
      providerLogoUrl,
    };
  } catch (error) {
    return {
      outcome: 'database_insert_failed',
      tournament: normalizedTournament,
      uploadedLogo,
      databaseInsertFailure: buildFailure(error),
    };
  }
};

const validateTournamentCreateInput = (tournament: TournamentCreateInput): TournamentCreateInvalidInput[] => {
  const invalidInput: TournamentCreateInvalidInput[] = [];

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

const createInvalidInput = (field: keyof TournamentCreateInput, errorMessage: string): TournamentCreateInvalidInput => {
  return {
    field,
    errorMessage,
  };
};

const normalizeTournamentCreateInput = (tournament: TournamentCreateInput): TournamentCreateInput => {
  return {
    tournamentPublicId: tournament.tournamentPublicId.trim(),
    baseUrl: tournament.baseUrl.trim(),
    publicUrl: tournament.publicUrl.trim(),
    slug: tournament.slug.trim(),
    provider: tournament.provider,
    season: tournament.season.trim(),
    mode: tournament.mode,
    label: tournament.label.trim(),
    standingsMode: tournament.standingsMode,
  };
};

const buildSofaScoreTournamentLogoUrl = (tournamentPublicId: string): string => {
  if (!tournamentPublicId.trim()) {
    throw new Error('tournamentPublicId is required to build the SofaScore tournament logo URL');
  }

  return `https://img.sofascore.com/api/v1/unique-tournament/${tournamentPublicId}/image`;
};

const buildFailure = (error: unknown): TournamentCreateFailure => {
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
