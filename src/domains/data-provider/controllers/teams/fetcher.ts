import { SofascoreTeams } from '@/domains/data-provider/providers/sofascore/teams';
import { TournamentRoundsQueries } from '@/domains/tournament-round/queries';
import { TournamentQuery } from '@/domains/tournament/queries';
import { sleep } from '@/utils';
import { SofascoreStandings } from '../../providers/sofascore/standings';
import { SofascoreTournamentRound } from '../../providers/sofascore/tournament-rounds';

export const fetchAndMapTeamsForRegularSeason = async (
  tournament: NonNullable<TournamentQuery>
) => {
  console.log(
    `[LOG] - [START] - FETCHING AND MAPPING TEAMS FOR REGULAR SEASON OF TOURNAMENT:${tournament.label} FROM STANDINGS`
  );

  const standings = await SofascoreStandings.fetchStandingsFromProvider(
    tournament.baseUrl
  );

  if (!standings) {
    console.error(
      `[LOG] - [FETCHING TEAMS FOR A REGULAR SEASON] - ${tournament.label} DOES NOT HAVE A STANDING IN PLACE YET`
    );
    return [];
  }

  const mappedTeamsFromStandings = await SofascoreTeams.mapTeamsFromStandings(
    standings,
    tournament.provider
  );

  console.log(
    `[LOG] - [SUCCESS] - FETCHING AND MAPPING TEAMS FOR REGULAR SEASON OF TOURNAMENT:${tournament.label} FROM STANDINGS: ${mappedTeamsFromStandings?.length} TEAMS`
  );

  return mappedTeamsFromStandings;
};

export const fetchAndMapTeamsFromKnockoutRounds = async (
  tournament: NonNullable<TournamentQuery>
) => {
  console.log('[LOG] - [START] - fetchAndMapTeamsFromKnockoutRounds', tournament.label);

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

  console.log('[LOG] - [END] - fetchAndMapTeamsFromKnockoutRounds', tournament.label);

  return ALL_TEAMS;
};

export const fetchAndMapTeamsForRegularAndKnockout = async (
  tournament: NonNullable<TournamentQuery>
) => {
  const regularSeasonTeams = await fetchAndMapTeamsForRegularSeason(tournament);
  const knockoutSeasonTeams = await fetchAndMapTeamsFromKnockoutRounds(tournament);

  console.log(
    `[LOG] - [TeamsController] - TOURNAMENT:${tournament.label} - TEAMS FROM STANDINGS: ${
      [...regularSeasonTeams].length
    } - TEAMS FROM KNOCKOUT ROUNDS: ${[...knockoutSeasonTeams].length}`
  );

  return [...regularSeasonTeams, ...knockoutSeasonTeams];
};
