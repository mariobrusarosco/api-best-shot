import { SofascoreTeams } from '@/domains/data-provider/providers/sofascore/teams';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { TournamentQuery } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { sleep } from '@/utils';

import { SofascoreStandings } from '../../providers/sofascore/standings';
import { SofascoreTournamentRound } from '../../providers/sofascore/tournament-rounds';

export const fetchAndMapTeamsForRegularSeason = async (
  tournament: NonNullable<TournamentQuery>
) => {
  const standings = await SofascoreStandings.fetchStandingsFromProvider(
    tournament.baseUrl
  );

  if (!standings) {
    Profiling.error({
      source: 'DATA_PROVIDER_TEAMS_FETCHER',
      error: new Error(
        `[DATA PROVIDER] - [TEAMS] - [FETCHING TEAMS FOR A REGULAR SEASON] - ${tournament.label} DOES NOT HAVE A STANDING IN PLACE YET`
      ),
    });
    return [];
  }

  const getTeamsFromStandings = async (tournament: NonNullable<TournamentQuery>) => {
    return SofascoreTeams.mapTeamsFromStandings(standings, tournament.provider);
  };

  const mappedTeamsFromStandings = await getTeamsFromStandings(tournament);

  Profiling.log({
    msg: `[DATA PROVIDER] - [TEAMS] - [FETCHING AND MAPPING] - [FOR REGULAR SEASON OF TOURNAMENT:${tournament.label}]`,
    data: {
      tournamentLabel: tournament.label,
      teams: mappedTeamsFromStandings,
    },
    source: 'DATA_PROVIDER_TEAMS_FETCHER',
  });

  return mappedTeamsFromStandings;
};

export const fetchAndMapTeamsFromKnockoutRounds = async (
  tournament: NonNullable<TournamentQuery>
) => {
  const knockoutRoundsList = await QUERIES_TOURNAMENT_ROUND.getKnockoutRounds(tournament.id!);

  const ALL_TEAMS = [];

  for (const round of knockoutRoundsList) {
    console.log('[LOG] - [START] - FETCHING ROUND:', round.providerUrl);

    const roundData = await SofascoreTournamentRound.fetchRoundFromProvider(
      round.providerUrl
    );

    const roundTeams = await SofascoreTeams.mapTeamsFromRound(
      roundData,
      tournament.provider
    );

    ALL_TEAMS.push(...roundTeams);
    console.log('[LOG] - [END] - FETCHING ROUND:');
    await sleep(3000);
  }

  Profiling.log({
    msg: '[DATA PROVIDER] - [TEAMS] - [FETCH] - [FROM KNOCKOUT ROUNDS]',
    data: {
      tournamentLabel: tournament.label,
      teams: ALL_TEAMS,
    },
    source: 'DATA_PROVIDER_TEAMS_FETCHER',
  });

  return ALL_TEAMS;
};

export const fetchAndMapTeamsForRegularAndKnockout = async (
  tournament: NonNullable<TournamentQuery>
) => {
  const regularSeasonTeams = await fetchAndMapTeamsForRegularSeason(tournament);
  const knockoutSeasonTeams = await fetchAndMapTeamsFromKnockoutRounds(tournament);

  return [...regularSeasonTeams, ...knockoutSeasonTeams];
};
