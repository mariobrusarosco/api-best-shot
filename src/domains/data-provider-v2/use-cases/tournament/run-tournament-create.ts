import type {
  TournamentCreateInput,
  TournamentCreateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/tournament-create';
import { insertTournament } from '@/domains/data-provider-v2/persistence/tournament/insert-tournament';
import { type BrowserAssetUploader } from '@/domains/data-provider-v2/transport/playwright/browser-asset-uploader';
import {
  buildSofaScoreTournamentLogoUrl,
  buildTournamentWorkflowFailure,
  normalizeTournamentWorkflowInput,
  validateTournamentWorkflowInput,
} from './helpers';

export const runTournamentCreate = async (input: {
  tournament: TournamentCreateInput;
  logoUploader: BrowserAssetUploader;
}): Promise<TournamentCreateWorkflowResult> => {
  const normalizedTournament = normalizeTournamentWorkflowInput(input.tournament);
  const invalidInput = validateTournamentWorkflowInput(normalizedTournament);

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
      logoUploadFailure: buildTournamentWorkflowFailure(error),
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
      databaseInsertFailure: buildTournamentWorkflowFailure(error),
    };
  }
};
