import { SofascoreTeams } from '@/domains/data-provider/providers/sofascore/teams';
import { TournamentQuery } from '@/domains/tournament/queries';
import { SofascoreStandings } from '../../providers/sofascore/standings';

export const fetchAndMapTeamsForRegularSeason = async (
  tournament: NonNullable<TournamentQuery>
) => {
  console.log(
    `[LOG] - [START] - FETCHING AND MAPPING TEAMS FOR REGULAR SEASON OF TOURNAMENT:${tournament.label} FROM STANDINGS`
  );

  const standings = await SofascoreStandings.fetchStandingsFromProvider(
    tournament.baseUrl
  );
  const mappedTeamsFromStandings = await SofascoreTeams.mapTeamsFromStandings(
    standings,
    tournament.provider
  );

  console.log(
    `[LOG] - [SUCCESS] - FETCHING AND MAPPING TEAMS FOR REGULAR SEASON OF TOURNAMENT:${tournament.label} FROM STANDINGS: ${mappedTeamsFromStandings?.length} TEAMS`
  );

  return mappedTeamsFromStandings;
};

// export const fetchAndMapTeamsFromKnockoutRounds = async (
//   tournament: NonNullable<TournamentQuery>
// ) => {
//   const teamsFromKnockoutRounds = await SofascoreTournamentRound(tournament.id!);
//   const mappedTeamsFromKnockoutRounds = await SofascoreTeams.mapTeamsFromKnockoutRounds(
//     teamsFromKnockoutRounds,
//     tournament.provider
//   );

//   console.log(
//     `[LOG] - [TeamsController] - TOURNAMENT:${tournament.label} - TEAMS FROM KNOCKOUT ROUNDS: ${mappedTeamsFromKnockoutRounds?.length}`
//   );

//   return mappedTeamsFromKnockoutRounds;
// };

export const fetchAndMapTeamsForRegularAndKnockout = async (
  tournament: NonNullable<TournamentQuery>
) => {
  const regularSeasonTeams = await fetchAndMapTeamsForRegularSeason(tournament);
  // const knockoutSeasonTeams = await fetchAndMapTeamsFromKnockoutRounds(tournament);

  const teamsToInsert = [...regularSeasonTeams];

  console.log(
    `[LOG] - [TeamsController] - TOURNAMENT:${tournament.label} - TEAMS FROM STANDINGS: ${regularSeasonTeams?.length} - `
  );

  return teamsToInsert;
};
