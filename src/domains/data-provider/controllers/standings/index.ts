import { TournamentQueries } from '@/domains/tournament/queries';
import { SofascoreStandings } from '../../providers/sofascore/standings';

const create = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const mode = tournament.mode;
  const label = tournament.label;

  console.log(`[LOG] - [START] - CREATING STANDINDS FOR TOURNAMENT ${label}`);

  if (mode === 'knockout-only')
    throw new Error('Knockout-only tournaments do not have standings');

  const data = await SofascoreStandings.fetchStandingsFromProvider(tournament.baseUrl);

  if (!data) {
    console.log(
      `[LOG] - [END] - CREATING STANDINDS FOR TOURNAMENT - ${tournament.label} DOESN'T HAVE STANDINGS IN PLACE YET!`
    );

    return null;
  }

  const mappedStandings = await SofascoreStandings.mapStandings(
    data,
    tournamentId,
    tournament.standings
  );
  const query = await SofascoreStandings.createOnDatabase(mappedStandings);

  console.log(`[LOG] - [END] - CREATING STANDINDS FOR TOURNAMENT ${label}`);

  return query;
};

const update = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  const mode = tournament.mode;
  const label = tournament.label;
  const standingsMode = tournament.standings;

  console.log(`[LOG] - [START] - UPDATING STANDINDS FOR TOURNAMENT ${label}`);

  if (mode === 'knockout-only')
    throw new Error('Knockout-only tournaments do not have standings');

  const data = await SofascoreStandings.fetchStandingsFromProvider(tournament.baseUrl);

  if (!data) {
    console.log(
      `[LOG] - [END] - UPDATING UPDATING FOR TOURNAMENT - ${label} DOESN'T HAVE STANDINGS IN PLACE YET!`
    );

    return null;
  }

  const mappedStandings = await SofascoreStandings.mapStandings(
    data,
    tournamentId,
    standingsMode
  );
  const query = await SofascoreStandings.upsertOnDatabase(mappedStandings);

  console.log(
    `[LOG] - [END] - UPDATING STANDINDS FOR TOURNAMENT ${label}`
    // mappedStandings.standings
  );

  return query;
};

export const StandingsController = {
  create,
  update,
};
