import { SofascoreTeams } from '@/domains/data-provider/providers/sofascore/teams';
import { TournamentRoundsQueries } from '@/domains/tournament-round/queries';
import { TournamentQuery } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { sleep } from '@/utils';
import { error } from 'console';
import { SofascoreStandings } from '../../providers/sofascore/standings';
import { SofascoreTournamentRound } from '../../providers/sofascore/tournament-rounds';

export const fetchAndMapTeamsForRegularSeason = async (
  tournament: NonNullable<TournamentQuery>
) => {
  const standings = await SofascoreStandings.fetchStandingsFromProvider(
    tournament.baseUrl
  );

  if (!standings) {
    Profiling.error(
      `[DATA PROVIDER] - [TEAMS] - [FETCHING TEAMS FOR A REGULAR SEASON] - ${tournament.label} DOES NOT HAVE A STANDING IN PLACE YET`,
      error
    );
    return [];
  }

  const mappedTeamsFromStandings = await SofascoreTeams.mapTeamsFromStandings(
    standings,
    tournament.provider
  );

  Profiling.log({
    msg: `[DATA PROVIDER] - [TEAMS] - [FETCHING AND MAPPING] - [FOR REGULAR SEASON OF TOURNAMENT:${tournament.label}]`,
    data: {
      tournamentLabel: tournament.label,
      teams: mappedTeamsFromStandings,
    },
    color: 'FgBlue'
  });

  return mappedTeamsFromStandings;
};

export const fetchAndMapTeamsFromKnockoutRounds = async (
  tournament: NonNullable<TournamentQuery>
) => {
  const knockoutRoundsList = await TournamentRoundsQueries.getKnockoutRounds({
    tournamentId: tournament.id!,
  });

  let ALL_TEAMS = [];

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
    color: 'FgBlue'
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
