import type { DB_InsertMatch } from '@/domains/match/schema';
import type {
  MatchesRoundContext,
  MatchesTournamentContext,
  TournamentMatchesUpdateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/matches';
import { listMatchesByExternalId } from '@/domains/data-provider-v2/persistence/match/list-matches-by-external-id';
import { listResolvedTeamsByExternalId } from '@/domains/data-provider-v2/persistence/match/list-resolved-teams-by-external-id';
import { upsertMatches } from '@/domains/data-provider-v2/persistence/match/upsert-matches';
import { listTournamentRounds } from '@/domains/data-provider-v2/persistence/tournament-round/list-tournament-rounds';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { collectDiscoveredMatchExternalIds, collectDiscoveredMatchTeamExternalIds } from './map-provider-matches';
import { prepareTournamentMatches } from './prepare-tournament-matches';

type UpsertableMatch = DB_InsertMatch & {
  externalId: string;
  roundId: string;
  roundLabel: string;
  requestUrl: string;
};

export const runTournamentMatchesUpdate = async (input: {
  tournament: MatchesTournamentContext;
  roundProvider: SofaScoreRoundProvider;
}): Promise<TournamentMatchesUpdateWorkflowResult> => {
  const rounds = await loadTournamentRounds(input.tournament.tournamentId);

  if (rounds.length === 0) {
    return {
      outcome: 'rounds_prerequisite_missing',
      tournament: input.tournament,
      rounds: [],
      fetchedRounds: 0,
      discoveredMatches: [],
      providerIssues: [],
      invalidProviderMatches: [],
      existingMatches: [],
      resolvedTeams: [],
      blockedMatches: [],
      upsertableMatches: [],
      upsertedMatches: [],
      missingRoundsPrerequisite: {
        errorMessage: 'Tournament does not have stored rounds. Create rounds before updating matches.',
      },
    };
  }

  const prepared = await prepareTournamentMatches({
    tournament: input.tournament,
    rounds,
    roundProvider: input.roundProvider,
  });

  if (prepared.discoveredMatches.length === 0) {
    return {
      outcome: 'provider_sources_missing_matches',
      tournament: input.tournament,
      rounds,
      fetchedRounds: prepared.fetchedRounds,
      discoveredMatches: [],
      providerIssues: prepared.providerIssues,
      invalidProviderMatches: prepared.invalidProviderMatches,
      existingMatches: [],
      resolvedTeams: [],
      blockedMatches: [],
      upsertableMatches: [],
      upsertedMatches: [],
    };
  }

  const existingMatches = await listMatchesByExternalId({
    provider: input.tournament.provider,
    externalIds: collectDiscoveredMatchExternalIds(prepared.discoveredMatches),
  });

  const resolvedTeams = await listResolvedTeamsByExternalId({
    provider: input.tournament.provider,
    externalIds: collectDiscoveredMatchTeamExternalIds(prepared.discoveredMatches),
  });

  const teamIdByExternalId = new Map(resolvedTeams.map(team => [team.externalId, team.id]));
  const upsertableMatches: UpsertableMatch[] = [];
  const blockedMatches: TournamentMatchesUpdateWorkflowResult['blockedMatches'] = [];

  for (const match of prepared.discoveredMatches) {
    const homeTeamId = teamIdByExternalId.get(match.externalHomeTeamId);
    const awayTeamId = teamIdByExternalId.get(match.externalAwayTeamId);
    const missingTeamExternalIds = [
      !homeTeamId ? match.externalHomeTeamId : null,
      !awayTeamId ? match.externalAwayTeamId : null,
    ].filter((externalId): externalId is string => !!externalId);

    if (missingTeamExternalIds.length > 0) {
      blockedMatches.push({
        roundId: match.roundId,
        roundLabel: match.roundLabel,
        roundSlug: match.roundSlug,
        requestUrl: match.requestUrl,
        matchExternalId: match.externalId,
        homeTeamExternalId: match.externalHomeTeamId,
        awayTeamExternalId: match.externalAwayTeamId,
        missingTeamExternalIds,
      });
      continue;
    }

    upsertableMatches.push({
      externalId: match.externalId,
      provider: match.provider,
      tournamentId: match.tournamentId,
      roundSlug: match.roundSlug,
      externalHomeTeamId: match.externalHomeTeamId,
      homeTeamId: homeTeamId!,
      homeScore: match.homeScore,
      homePenaltiesScore: match.homePenaltiesScore,
      externalAwayTeamId: match.externalAwayTeamId,
      awayTeamId: awayTeamId!,
      awayScore: match.awayScore,
      awayPenaltiesScore: match.awayPenaltiesScore,
      date: match.date,
      status: match.status,
      roundId: match.roundId,
      roundLabel: match.roundLabel,
      requestUrl: match.requestUrl,
    });
  }

  if (upsertableMatches.length === 0) {
    return {
      outcome: 'processed',
      tournament: input.tournament,
      rounds,
      fetchedRounds: prepared.fetchedRounds,
      discoveredMatches: prepared.discoveredMatches,
      providerIssues: prepared.providerIssues,
      invalidProviderMatches: prepared.invalidProviderMatches,
      existingMatches,
      resolvedTeams,
      blockedMatches,
      upsertableMatches: [],
      upsertedMatches: [],
    };
  }

  try {
    const upsertedMatches = await upsertMatches({
      matches: upsertableMatches.map(match => stripUpsertableMetadata(match)),
    });

    return {
      outcome: 'processed',
      tournament: input.tournament,
      rounds,
      fetchedRounds: prepared.fetchedRounds,
      discoveredMatches: prepared.discoveredMatches,
      providerIssues: prepared.providerIssues,
      invalidProviderMatches: prepared.invalidProviderMatches,
      existingMatches,
      resolvedTeams,
      blockedMatches,
      upsertableMatches,
      upsertedMatches,
    };
  } catch (error) {
    return {
      outcome: 'database_upsert_failed',
      tournament: input.tournament,
      rounds,
      fetchedRounds: prepared.fetchedRounds,
      discoveredMatches: prepared.discoveredMatches,
      providerIssues: prepared.providerIssues,
      invalidProviderMatches: prepared.invalidProviderMatches,
      existingMatches,
      resolvedTeams,
      blockedMatches,
      upsertableMatches,
      upsertedMatches: [],
      databaseUpsertFailure: buildUpdateFailure(error),
    };
  }
};

const loadTournamentRounds = async (tournamentId: string): Promise<MatchesRoundContext[]> => {
  const rounds = await listTournamentRounds({
    tournamentId,
  });

  return rounds.map(round => ({
    id: round.id,
    label: round.label,
    slug: round.slug,
    providerUrl: round.providerUrl,
  }));
};

const stripUpsertableMetadata = (match: UpsertableMatch): DB_InsertMatch => {
  return {
    externalId: match.externalId,
    provider: match.provider,
    tournamentId: match.tournamentId,
    roundSlug: match.roundSlug,
    homeTeamId: match.homeTeamId,
    externalHomeTeamId: match.externalHomeTeamId,
    homeScore: match.homeScore,
    homePenaltiesScore: match.homePenaltiesScore,
    awayTeamId: match.awayTeamId,
    externalAwayTeamId: match.externalAwayTeamId,
    awayScore: match.awayScore,
    awayPenaltiesScore: match.awayPenaltiesScore,
    date: match.date,
    status: match.status,
  };
};

const buildUpdateFailure = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
    };
  }

  return {
    errorMessage: String(error),
  };
};
