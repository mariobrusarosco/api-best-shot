import type {
  TeamsCreateFailure,
  TeamsCreateUploadedBadge,
  TeamsTournamentContext,
  TournamentTeamsUpdateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/teams';
import { listTeamsByExternalId } from '@/domains/data-provider-v2/persistence/team/list-teams-by-external-id';
import { upsertTeams } from '@/domains/data-provider-v2/persistence/team/upsert-teams';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { SofaScoreStandingsProvider } from '@/domains/data-provider-v2/providers/sofascore/standings-provider';
import type { BrowserAssetUploader } from '@/domains/data-provider-v2/transport/playwright/browser-asset-uploader';
import { collectDiscoveredTeamExternalIds } from './map-provider-teams';
import { prepareTournamentTeams } from './prepare-tournament-teams';

export const runTournamentTeamsUpdate = async (input: {
  tournament: TeamsTournamentContext;
  standingsProvider: SofaScoreStandingsProvider;
  roundProvider: SofaScoreRoundProvider;
  badgeUploader: BrowserAssetUploader;
}): Promise<TournamentTeamsUpdateWorkflowResult> => {
  const prepared = await prepareTournamentTeams({
    tournament: input.tournament,
    standingsProvider: input.standingsProvider,
    roundProvider: input.roundProvider,
  });

  const existingTeams = await listTeamsByExternalId({
    provider: input.tournament.provider,
    externalIds: collectDiscoveredTeamExternalIds(prepared.discoveredTeams),
  });

  if (prepared.discoveredTeams.length === 0) {
    return {
      outcome: 'provider_sources_missing_teams',
      tournament: input.tournament,
      fetchedSources: prepared.fetchedSources,
      fetchedTeams: 0,
      discoveredTeams: [],
      providerMissingSources: prepared.providerMissingSources,
      invalidProviderTeams: prepared.invalidProviderTeams,
      existingTeams: [],
      upsertableTeams: [],
      uploadedBadges: [],
      upsertedTeams: [],
      createdDuringUpdateTeams: [],
      updatedTeams: [],
    };
  }

  const upsertableTeams = prepared.discoveredTeams;
  const uploadedBadges: TeamsCreateUploadedBadge[] = [];

  for (const team of upsertableTeams) {
    try {
      const uploadedBadge = await input.badgeUploader.upload({
        providerLogoUrl: buildSofaScoreTeamBadgeUrl(team.externalId),
        filename: `team-${team.externalId}`,
      });

      uploadedBadges.push({
        teamExternalId: team.externalId,
        assetKey: uploadedBadge.assetKey,
        assetUrl: uploadedBadge.assetUrl,
        contentType: uploadedBadge.contentType,
        requestUrl: uploadedBadge.requestUrl,
        responseUrl: uploadedBadge.responseUrl,
      });
    } catch (error) {
      return {
        outcome: 'asset_upload_failed',
        tournament: input.tournament,
        fetchedSources: prepared.fetchedSources,
        fetchedTeams: prepared.discoveredTeams.length,
        discoveredTeams: prepared.discoveredTeams,
        providerMissingSources: prepared.providerMissingSources,
        invalidProviderTeams: prepared.invalidProviderTeams,
        existingTeams,
        upsertableTeams,
        uploadedBadges,
        upsertedTeams: [],
        createdDuringUpdateTeams: [],
        updatedTeams: [],
        assetUploadFailure: buildUpdateFailure({
          error,
          teamExternalId: team.externalId,
          requestUrl: buildSofaScoreTeamBadgeUrl(team.externalId),
        }),
      };
    }
  }

  try {
    const badgeByExternalId = new Map(uploadedBadges.map(badge => [badge.teamExternalId, badge]));
    const existingExternalIds = new Set(existingTeams.map(team => team.externalId));
    const upsertedTeams = await upsertTeams({
      teams: upsertableTeams.map(team => ({
        discoveredTeam: team,
        badgeUrl: badgeByExternalId.get(team.externalId)?.assetUrl ?? '',
      })),
    });

    const createdDuringUpdateTeams = upsertedTeams.filter(team => !existingExternalIds.has(team.externalId));
    const updatedTeams = upsertedTeams.filter(team => existingExternalIds.has(team.externalId));

    return {
      outcome: 'processed',
      tournament: input.tournament,
      fetchedSources: prepared.fetchedSources,
      fetchedTeams: prepared.discoveredTeams.length,
      discoveredTeams: prepared.discoveredTeams,
      providerMissingSources: prepared.providerMissingSources,
      invalidProviderTeams: prepared.invalidProviderTeams,
      existingTeams,
      upsertableTeams,
      uploadedBadges,
      upsertedTeams,
      createdDuringUpdateTeams,
      updatedTeams,
    };
  } catch (error) {
    return {
      outcome: 'database_upsert_failed',
      tournament: input.tournament,
      fetchedSources: prepared.fetchedSources,
      fetchedTeams: prepared.discoveredTeams.length,
      discoveredTeams: prepared.discoveredTeams,
      providerMissingSources: prepared.providerMissingSources,
      invalidProviderTeams: prepared.invalidProviderTeams,
      existingTeams,
      upsertableTeams,
      uploadedBadges,
      upsertedTeams: [],
      createdDuringUpdateTeams: [],
      updatedTeams: [],
      databaseUpsertFailure: buildUpdateFailure({
        error,
      }),
    };
  }
};

const buildSofaScoreTeamBadgeUrl = (teamExternalId: string): string => {
  return `https://img.sofascore.com/api/v1/team/${teamExternalId}/image`;
};

const buildUpdateFailure = (input: {
  error: unknown;
  teamExternalId?: string;
  requestUrl?: string;
}): TeamsCreateFailure => {
  if (input.error instanceof Error) {
    return {
      teamExternalId: input.teamExternalId,
      requestUrl: input.requestUrl,
      errorMessage: input.error.message,
    };
  }

  return {
    teamExternalId: input.teamExternalId,
    requestUrl: input.requestUrl,
    errorMessage: String(input.error),
  };
};
