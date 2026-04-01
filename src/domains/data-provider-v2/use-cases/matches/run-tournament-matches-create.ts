import type { DB_InsertMatch } from '@/domains/match/schema';
import type {
  MatchesRoundContext,
  MatchesTournamentContext,
  TournamentMatchesCreateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/matches';
import { listMatchesByExternalId } from '@/domains/data-provider-v2/persistence/match/list-matches-by-external-id';
import { insertMatches } from '@/domains/data-provider-v2/persistence/match/insert-matches';
import { listResolvedTeamsByExternalId } from '@/domains/data-provider-v2/persistence/match/list-resolved-teams-by-external-id';
import { listTournamentRounds } from '@/domains/data-provider-v2/persistence/tournament-round/list-tournament-rounds';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { collectDiscoveredMatchExternalIds, collectDiscoveredMatchTeamExternalIds } from './map-provider-matches';
import { prepareTournamentMatches } from './prepare-tournament-matches';

type CreatableMatch = DB_InsertMatch & {
  externalId: string;
  roundId: string;
  roundLabel: string;
  requestUrl: string;
};

export const runTournamentMatchesCreate = async (input: {
  tournament: MatchesTournamentContext;
  roundProvider: SofaScoreRoundProvider;
}): Promise<TournamentMatchesCreateWorkflowResult> => {
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
      creatableMatches: [],
      createdMatches: [],
      missingRoundsPrerequisite: {
        errorMessage: 'Tournament does not have stored rounds. Create rounds before creating matches.',
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
      creatableMatches: [],
      createdMatches: [],
    };
  }

  const existingMatches = await listMatchesByExternalId({
    provider: input.tournament.provider,
    externalIds: collectDiscoveredMatchExternalIds(prepared.discoveredMatches),
  });

  const existingMatchExternalIds = new Set(existingMatches.map(match => match.externalId));
  const insertableCandidates = prepared.discoveredMatches.filter(
    match => !existingMatchExternalIds.has(match.externalId)
  );
  const resolvedTeams = await listResolvedTeamsByExternalId({
    provider: input.tournament.provider,
    externalIds: collectDiscoveredMatchTeamExternalIds(insertableCandidates),
  });

  const teamIdByExternalId = new Map(resolvedTeams.map(team => [team.externalId, team.id]));
  const creatableMatches: CreatableMatch[] = [];
  const blockedMatches: TournamentMatchesCreateWorkflowResult['blockedMatches'] = [];

  for (const match of insertableCandidates) {
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

    creatableMatches.push({
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

  if (creatableMatches.length === 0) {
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
      creatableMatches: [],
      createdMatches: [],
    };
  }

  try {
    const createdMatches = await insertMatches({
      matches: creatableMatches.map(match => stripCreatableMetadata(match)),
    });

    const createdMatchExternalIds = new Set(createdMatches.map(match => match.externalId));
    const missingCreatedExternalIds = creatableMatches
      .map(match => match.externalId)
      .filter(externalId => !createdMatchExternalIds.has(externalId));

    const racedExistingMatches =
      missingCreatedExternalIds.length > 0
        ? await listMatchesByExternalId({
            provider: input.tournament.provider,
            externalIds: missingCreatedExternalIds,
          })
        : [];

    return {
      outcome: 'processed',
      tournament: input.tournament,
      rounds,
      fetchedRounds: prepared.fetchedRounds,
      discoveredMatches: prepared.discoveredMatches,
      providerIssues: prepared.providerIssues,
      invalidProviderMatches: prepared.invalidProviderMatches,
      existingMatches: mergeResolvedMatches(existingMatches, racedExistingMatches),
      resolvedTeams,
      blockedMatches,
      creatableMatches,
      createdMatches,
    };
  } catch (error) {
    return {
      outcome: 'database_insert_failed',
      tournament: input.tournament,
      rounds,
      fetchedRounds: prepared.fetchedRounds,
      discoveredMatches: prepared.discoveredMatches,
      providerIssues: prepared.providerIssues,
      invalidProviderMatches: prepared.invalidProviderMatches,
      existingMatches,
      resolvedTeams,
      blockedMatches,
      creatableMatches,
      createdMatches: [],
      databaseInsertFailure: buildCreateFailure(error),
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

const stripCreatableMetadata = (match: CreatableMatch): DB_InsertMatch => {
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

const buildCreateFailure = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
    };
  }

  return {
    errorMessage: String(error),
  };
};

const mergeResolvedMatches = <TMatch extends { id: string; externalId: string }>(
  left: TMatch[],
  right: TMatch[]
): TMatch[] => {
  const merged = new Map<string, TMatch>();

  for (const match of [...left, ...right]) {
    merged.set(match.externalId, match);
  }

  return Array.from(merged.values());
};
