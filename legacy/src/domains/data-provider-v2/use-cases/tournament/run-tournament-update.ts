import type {
  TournamentUpdateField,
  TournamentUpdateInput,
  TournamentUpdateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/tournament-update';
import { updateTournament } from '@/domains/data-provider-v2/persistence/tournament/update-tournament';
import { type BrowserAssetUploader } from '@/domains/data-provider-v2/transport/playwright/browser-asset-uploader';
import type { DB_SelectTournament } from '@/domains/tournament/schema';
import {
  buildSofaScoreTournamentLogoUrl,
  buildTournamentWorkflowFailure,
  normalizeTournamentWorkflowInput,
  validateTournamentWorkflowInput,
} from './helpers';

export const runTournamentUpdate = async (input: {
  tournamentId: string;
  previousTournament: DB_SelectTournament;
  tournament: TournamentUpdateInput;
  logoUploader?: BrowserAssetUploader;
}): Promise<TournamentUpdateWorkflowResult> => {
  const normalizedTournament = normalizeTournamentWorkflowInput(input.tournament);
  const invalidInput = validateTournamentWorkflowInput(normalizedTournament);
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
        logoUploadFailure: buildTournamentWorkflowFailure(error),
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
      databaseUpdateFailure: buildTournamentWorkflowFailure(error),
    };
  }
};

export const normalizeTournamentUpdateInput = (tournament: TournamentUpdateInput): TournamentUpdateInput => {
  return normalizeTournamentWorkflowInput(tournament);
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
