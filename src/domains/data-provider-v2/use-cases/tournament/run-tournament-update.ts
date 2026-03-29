import type {
  TournamentUpdateFailure,
  TournamentUpdateField,
  TournamentUpdateInput,
  TournamentUpdateInvalidInput,
  TournamentUpdateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/tournament-update';
import { updateTournament } from '@/domains/data-provider-v2/persistence/tournament/update-tournament';
import {
  BrowserAssetTransportError,
  type BrowserAssetUploader,
} from '@/domains/data-provider-v2/transport/playwright/browser-asset-uploader';
import type { DB_SelectTournament } from '@/domains/tournament/schema';

const VALID_TOURNAMENT_MODES = ['regular-season-and-knockout', 'regular-season-only', 'knockout-only'] as const;
const VALID_STANDINGS_MODES = ['unique-group', 'multi-group'] as const;

export const runTournamentUpdate = async (input: {
  tournamentId: string;
  previousTournament: DB_SelectTournament;
  tournament: TournamentUpdateInput;
  logoUploader?: BrowserAssetUploader;
}): Promise<TournamentUpdateWorkflowResult> => {
  const normalizedTournament = normalizeTournamentUpdateInput(input.tournament);
  const invalidInput = validateTournamentUpdateInput(normalizedTournament);
  const changedFields = listTournamentUpdateChangedFields({
    previousTournament: input.previousTournament,
    tournament: normalizedTournament,
  });
  const logoRefreshRequired = shouldRefreshTournamentLogo({
    previousTournament: input.previousTournament,
    tournament: normalizedTournament,
  });

  if (invalidInput.length > 0) {
    return {
      outcome: 'invalid_input',
      tournamentId: input.tournamentId,
      previousTournament: input.previousTournament,
      tournament: normalizedTournament,
      changedFields,
      logoRefreshRequired,
      logoRefreshPerformed: false,
      invalidInput,
    };
  }

  let providerLogoUrl: string | undefined;
  let uploadedLogo = undefined;

  if (logoRefreshRequired) {
    if (!input.logoUploader) {
      throw new Error('logoUploader is required when tournament update needs a logo refresh');
    }

    providerLogoUrl = buildSofaScoreTournamentLogoUrl(normalizedTournament.tournamentPublicId);

    try {
      uploadedLogo = await input.logoUploader.upload({
        providerLogoUrl,
        filename: `tournament-${normalizedTournament.tournamentPublicId}`,
      });
    } catch (error) {
      return {
        outcome: 'logo_upload_failed',
        tournamentId: input.tournamentId,
        previousTournament: input.previousTournament,
        tournament: normalizedTournament,
        changedFields,
        logoRefreshRequired,
        logoRefreshPerformed: false,
        providerLogoUrl,
        logoUploadFailure: buildFailure(error),
      };
    }
  }

  try {
    const updatedTournament = await updateTournament({
      tournamentId: input.tournamentId,
      tournament: {
        externalId: normalizedTournament.tournamentPublicId,
        baseUrl: normalizedTournament.baseUrl,
        publicUrl: normalizedTournament.publicUrl,
        slug: normalizedTournament.slug,
        provider: normalizedTournament.provider,
        season: normalizedTournament.season,
        mode: normalizedTournament.mode,
        label: normalizedTournament.label,
        standingsMode: normalizedTournament.standingsMode,
        logo: uploadedLogo?.assetUrl ?? input.previousTournament.logo,
      },
    });

    if (!updatedTournament) {
      return {
        outcome: 'database_update_failed',
        tournamentId: input.tournamentId,
        previousTournament: input.previousTournament,
        tournament: normalizedTournament,
        changedFields,
        logoRefreshRequired,
        logoRefreshPerformed: Boolean(uploadedLogo),
        providerLogoUrl,
        uploadedLogo,
        databaseUpdateFailure: {
          errorMessage: `Tournament "${input.tournamentId}" not found while updating`,
        },
      };
    }

    return {
      outcome: 'updated',
      tournamentId: input.tournamentId,
      previousTournament: input.previousTournament,
      tournament: normalizedTournament,
      changedFields,
      logoRefreshRequired,
      logoRefreshPerformed: Boolean(uploadedLogo),
      providerLogoUrl,
      uploadedLogo,
      updatedTournament,
    };
  } catch (error) {
    return {
      outcome: 'database_update_failed',
      tournamentId: input.tournamentId,
      previousTournament: input.previousTournament,
      tournament: normalizedTournament,
      changedFields,
      logoRefreshRequired,
      logoRefreshPerformed: Boolean(uploadedLogo),
      providerLogoUrl,
      uploadedLogo,
      databaseUpdateFailure: buildFailure(error),
    };
  }
};

const validateTournamentUpdateInput = (tournament: TournamentUpdateInput): TournamentUpdateInvalidInput[] => {
  const invalidInput: TournamentUpdateInvalidInput[] = [];

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

const createInvalidInput = (field: keyof TournamentUpdateInput, errorMessage: string): TournamentUpdateInvalidInput => {
  return {
    field,
    errorMessage,
  };
};

export const normalizeTournamentUpdateInput = (tournament: TournamentUpdateInput): TournamentUpdateInput => {
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

const listTournamentUpdateChangedFields = (input: {
  previousTournament: DB_SelectTournament;
  tournament: TournamentUpdateInput;
}): TournamentUpdateField[] => {
  const changedFields: TournamentUpdateField[] = [];

  if (input.previousTournament.externalId !== input.tournament.tournamentPublicId) {
    changedFields.push('tournamentPublicId');
  }

  if (input.previousTournament.baseUrl !== input.tournament.baseUrl) {
    changedFields.push('baseUrl');
  }

  if ((input.previousTournament.publicUrl ?? '') !== input.tournament.publicUrl) {
    changedFields.push('publicUrl');
  }

  if (input.previousTournament.slug !== input.tournament.slug) {
    changedFields.push('slug');
  }

  if (input.previousTournament.provider !== input.tournament.provider) {
    changedFields.push('provider');
  }

  if (input.previousTournament.season !== input.tournament.season) {
    changedFields.push('season');
  }

  if (input.previousTournament.mode !== input.tournament.mode) {
    changedFields.push('mode');
  }

  if (input.previousTournament.label !== input.tournament.label) {
    changedFields.push('label');
  }

  if (input.previousTournament.standingsMode !== input.tournament.standingsMode) {
    changedFields.push('standingsMode');
  }

  if (shouldRefreshTournamentLogo(input)) {
    changedFields.push('logo');
  }

  return changedFields;
};

export const shouldRefreshTournamentLogo = (input: {
  previousTournament: DB_SelectTournament;
  tournament: TournamentUpdateInput;
}): boolean => {
  return (
    input.previousTournament.externalId !== input.tournament.tournamentPublicId ||
    !input.previousTournament.logo ||
    !input.previousTournament.logo.trim()
  );
};

const buildSofaScoreTournamentLogoUrl = (tournamentPublicId: string): string => {
  if (!tournamentPublicId.trim()) {
    throw new Error('tournamentPublicId is required to build the SofaScore tournament logo URL');
  }

  return `https://img.sofascore.com/api/v1/unique-tournament/${tournamentPublicId}/image`;
};

const buildFailure = (error: unknown): TournamentUpdateFailure => {
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
