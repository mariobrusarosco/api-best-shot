import { TournamentQueries } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { SofascoreStandings } from '../../providers/sofascore/standings';

const create = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const mode = tournament.mode;
  const label = tournament.label;

  Profiling.log(
    `[LOG] - [DATA PROVIDER] - [START] - CREATING STANDINDS FOR TOURNAMENT ${label}`
  );

  if (mode === 'knockout-only') {
    Profiling.log('Knockout-only tournaments do not have standings');
    return null;
  }

  const data = await SofascoreStandings.fetchStandingsFromProvider(tournament.baseUrl);

  if (!data) {
    Profiling.log(
      `[LOG] - [DATA PROVIDER] - [END] - CREATING STANDINDS FOR TOURNAMENT - ${tournament.label} DOESN'T HAVE STANDINGS IN PLACE YET!`
    );

    return null;
  }

  const mappedStandings = await SofascoreStandings.mapStandings(
    data,
    tournamentId,
    tournament.standings
  );
  const query = await SofascoreStandings.createOnDatabase(mappedStandings);

  Profiling.log(
    `[LOG] - [DATA PROVIDER] - [END] - CREATING STANDINDS FOR TOURNAMENT ${label}`
  );

  return query;
};

const update = async (tournamentId: string) => {
  const tournament = await TournamentQueries.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const mode = tournament.mode;
  const label = tournament.label;
  const standingsMode = tournament.standings;

  Profiling.log(
    `[LOG] - [DATA PROVIDER] - [START] - UPDATING STANDINDS FOR TOURNAMENT ${label}`
  );

  if (mode === 'knockout-only') {
    Profiling.log('Knockout-only tournaments do not have standings');
    return null;
  }

  const data = await SofascoreStandings.fetchStandingsFromProvider(tournament.baseUrl);

  if (!data) {
    Profiling.log(
      `[LOG] - [DATA PROVIDER] - [END] - UPDATING UPDATING FOR TOURNAMENT - ${label} DOESN'T HAVE STANDINGS IN PLACE YET!`
    );

    return null;
  }

  const mappedStandings = await SofascoreStandings.mapStandings(
    data,
    tournamentId,
    standingsMode
  );
  const query = await SofascoreStandings.upsertOnDatabase(mappedStandings);

  Profiling.log(
    `[LOG] - [DATA PROVIDER] - [END] - UPDATING STANDINDS FOR TOURNAMENT ${label}`,
    {
      mappedStandings,
    }
  );

  return query;
};

export const StandingsController = {
  create,
  update,
};
