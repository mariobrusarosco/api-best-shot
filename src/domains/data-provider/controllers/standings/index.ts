import { TournamentQueries } from '@/domains/tournament/queries';
import { SofascoreStandings } from '../../providers/sofascore/standings';

const create = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const tournamentMode = tournament.mode;
  const tournamentLabel = tournament.label;

  console.log(`[LOG] - [START] - CREATING STANDINDS FOR TOURNAMENT ${tournamentLabel}`);

  if (tournamentMode === 'knockout-only')
    throw new Error('Knockout-only tournaments do not have standings');

  const data = await SofascoreStandings.fetchStandingsFromProvider(tournament.baseUrl);

  if (!data) {
    console.log(
      `[LOG] - [END] - CREATING STANDINDS FOR TOURNAMENT - ${tournament.label} DOESN'T HAVE STANDINGS IN PLACE YET!`
    );

    return null;
  }

  const mappedStandings = await SofascoreStandings.mapStandings(data, tournamentId);
  const query = await SofascoreStandings.createOnDatabase(mappedStandings);

  console.log(`[LOG] - [END] - CREATING STANDINDS FOR TOURNAMENT ${tournamentLabel}`);

  return query;
};

const update = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  const tournamentMode = tournament.mode;
  const tournamentLabel = tournament.label;

  console.log(`[LOG] - [START] - UPDATING STANDINDS FOR TOURNAMENT ${tournamentLabel}`);

  if (tournamentMode === 'knockout-only')
    throw new Error('Knockout-only tournaments do not have standings');

  const data = await SofascoreStandings.fetchStandingsFromProvider(tournament.baseUrl);

  if (!data) {
    console.log(
      `[LOG] - [END] - UPDATING UPDATING FOR TOURNAMENT - ${tournamentLabel} DOESN'T HAVE STANDINGS IN PLACE YET!`
    );

    return null;
  }

  // if (data.standings[0].tournament.id !== Number(tournament.externalId)) {
  //   console.log(
  //     `[LOG] - [END] - UPDATING STANDINDS FOR TOURNAMENT ${tournamentLabel} - TOURNAMENT ID MISMATCH!`
  //   );
  //   return null;
  // }

  // console.log(data.standings[0].tournament.id, tournament.externalId);

  const mappedStandings = await SofascoreStandings.mapStandings(data, tournamentId);
  const query = await SofascoreStandings.createOnDatabase(mappedStandings);

  console.log(`[LOG] - [END] - UPDATING STANDINDS FOR TOURNAMENT ${tournamentLabel}`);

  return query;
};

export const StandingsController = {
  create,
  update,
};
