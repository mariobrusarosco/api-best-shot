import { SofascoreTeams } from '@/domains/data-provider-v2/providers/sofascore/sofacore-teams';
import { TournamentQuery } from '@/domains/tournament/queries';

export const fetchTeamsForRegularSeason = async (
  tournament: NonNullable<TournamentQuery>
) => {
  const teamsFromStandings = await SofascoreTeams.fetchTeamsFromStandings(
    tournament.baseUrl
  );
  const mappedTeamsFromStandings = await SofascoreTeams.mapTeamsFromStandings(
    teamsFromStandings,
    tournament.provider
  );

  console.log(
    `[LOG] - [TeamsController] - TOURNAMENT:${tournament.label} - TEAMS FROM STANDINGS: ${teamsFromStandings?.length}`
  );

  return mappedTeamsFromStandings;
};

export const fetchTeamsFromKnockoutRounds = async (
  tournament: NonNullable<TournamentQuery>
) => {
  const teamsFromKnockoutRounds = await SofascoreTeams.fetchTeamsFromKnockoutRounds(
    tournament.id!
  );
  const mappedTeamsFromKnockoutRounds = await SofascoreTeams.mapTeamsFromKnockoutRounds(
    teamsFromKnockoutRounds,
    tournament.provider
  );

  console.log(
    `[LOG] - [TeamsController] - TOURNAMENT:${tournament.label} - TEAMS FROM KNOCKOUT ROUNDS: ${mappedTeamsFromKnockoutRounds?.length}`
  );

  return mappedTeamsFromKnockoutRounds;
};

export const fetchTeamForRegularAndKnockoutTournament = async (
  tournament: NonNullable<TournamentQuery>
) => {
  const regularSeasonTeams = await fetchTeamsForRegularSeason(tournament);
  const knockoutSeasonTeams = await fetchTeamsFromKnockoutRounds(tournament);

  const teamsToInsert = [...regularSeasonTeams, ...knockoutSeasonTeams];

  console.log(
    `[LOG] - [TeamsController] - TOURNAMENT:${tournament.label} - TEAMS FROM STANDINGS: ${regularSeasonTeams?.length} - TEAMS FROM KNOCKOUT ROUNDS: ${knockoutSeasonTeams?.length}`
  );

  return teamsToInsert;
};
