import { setTimeout as sleep } from 'timers/promises';
import type {
  TeamsCreateFailure,
  TeamsCreateUploadedBadge,
  TeamsTournamentContext,
  TournamentTeamsCreateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/teams';
import { insertTeams } from '@/domains/data-provider-v2/persistence/team/insert-teams';
import { listTeamsByExternalId } from '@/domains/data-provider-v2/persistence/team/list-teams-by-external-id';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { SofaScoreStandingsProvider } from '@/domains/data-provider-v2/providers/sofascore/standings-provider';
import { type BrowserAssetUploader } from '@/domains/data-provider-v2/transport/playwright/browser-asset-uploader';
import { collectDiscoveredTeamExternalIds } from './map-provider-teams';
import { prepareTournamentTeams } from './prepare-tournament-teams';

const TEAM_BADGE_UPLOAD_DELAY_MS = 3000;

export const runTournamentTeamsCreate = async (input: {
  tournament: TeamsTournamentContext;
  standingsProvider: SofaScoreStandingsProvider;
  roundProvider: SofaScoreRoundProvider;
  badgeUploader: BrowserAssetUploader;
}): Promise<TournamentTeamsCreateWorkflowResult> => {
  const prepared = await prepareTournamentTeams({
    tournament: input.tournament,
    standingsProvider: input.standingsProvider,
    roundProvider: input.roundProvider,
  });

  const existingTeams = await listTeamsByExternalId({
    provider: input.tournament.provider,
    externalIds: collectDiscoveredTeamExternalIds(prepared.discoveredTeams),
  });

  const existingTeamIdByExternalId = new Map(existingTeams.map(team => [team.externalId, team.id]));
  const creatableTeams = prepared.discoveredTeams.filter(team => !existingTeamIdByExternalId.has(team.externalId));

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
      creatableTeams: [],
      uploadedBadges: [],
      createdTeams: [],
    };
  }

  if (creatableTeams.length === 0) {
    return {
      outcome: 'processed',
      tournament: input.tournament,
      fetchedSources: prepared.fetchedSources,
      fetchedTeams: prepared.discoveredTeams.length,
      discoveredTeams: prepared.discoveredTeams,
      providerMissingSources: prepared.providerMissingSources,
      invalidProviderTeams: prepared.invalidProviderTeams,
      existingTeams,
      creatableTeams: [],
      uploadedBadges: [],
      createdTeams: [],
    };
  }

  const uploadedBadges: TeamsCreateUploadedBadge[] = [];

  for (const [index, team] of creatableTeams.entries()) {
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
        creatableTeams,
        uploadedBadges,
        createdTeams: [],
        assetUploadFailure: buildCreateFailure({
          error,
          teamExternalId: team.externalId,
          requestUrl: buildSofaScoreTeamBadgeUrl(team.externalId),
        }),
      };
    } finally {
      if (index < creatableTeams.length - 1) {
        await sleep(TEAM_BADGE_UPLOAD_DELAY_MS);
      }
    }
  }

  try {
    const badgeByExternalId = new Map(uploadedBadges.map(badge => [badge.teamExternalId, badge]));

    const createdTeams = await insertTeams({
      teams: creatableTeams.map(team => ({
        discoveredTeam: team,
        badgeUrl: badgeByExternalId.get(team.externalId)?.assetUrl ?? '',
      })),
    });

    const createdTeamExternalIds = new Set(createdTeams.map(team => team.externalId));
    const missingCreatedExternalIds = creatableTeams
      .map(team => team.externalId)
      .filter(externalId => !createdTeamExternalIds.has(externalId));

    const racedExistingTeams =
      missingCreatedExternalIds.length > 0
        ? await listTeamsByExternalId({
            provider: input.tournament.provider,
            externalIds: missingCreatedExternalIds,
          })
        : [];

    return {
      outcome: 'processed',
      tournament: input.tournament,
      fetchedSources: prepared.fetchedSources,
      fetchedTeams: prepared.discoveredTeams.length,
      discoveredTeams: prepared.discoveredTeams,
      providerMissingSources: prepared.providerMissingSources,
      invalidProviderTeams: prepared.invalidProviderTeams,
      existingTeams: mergeResolvedTeams(existingTeams, racedExistingTeams),
      creatableTeams,
      uploadedBadges,
      createdTeams,
    };
  } catch (error) {
    return {
      outcome: 'database_insert_failed',
      tournament: input.tournament,
      fetchedSources: prepared.fetchedSources,
      fetchedTeams: prepared.discoveredTeams.length,
      discoveredTeams: prepared.discoveredTeams,
      providerMissingSources: prepared.providerMissingSources,
      invalidProviderTeams: prepared.invalidProviderTeams,
      existingTeams,
      creatableTeams,
      uploadedBadges,
      createdTeams: [],
      databaseInsertFailure: buildCreateFailure({
        error,
      }),
    };
  }
};

const buildSofaScoreTeamBadgeUrl = (teamExternalId: string): string => {
  return `https://img.sofascore.com/api/v1/team/${teamExternalId}/image`;
};

const buildCreateFailure = (input: {
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

const mergeResolvedTeams = <TTeam extends { id: string; externalId: string }>(
  left: TTeam[],
  right: TTeam[]
): TTeam[] => {
  const merged = new Map<string, TTeam>();

  for (const team of [...left, ...right]) {
    merged.set(team.externalId, team);
  }

  return Array.from(merged.values());
};
