import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { SofascoreStandings } from '../../providers/sofascore/standings';

const create = async (tournamentId: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const mode = tournament.mode;
  const label = tournament.label;

  console.log(
    `[LOG] - [DATA PROVIDER] - [START] - CREATING STANDINGS FOR TOURNAMENT ${label}`
  );

  if (mode === 'knockout-only') {
    Profiling.log('Knockout-only tournaments do not have standings');
    return null;
  }

  const data = await SofascoreStandings.fetchStandingsFromProvider(tournament.baseUrl);

  if (!data) {
    Profiling.log(
      `[DATA PROVIDER] - [STANDINGS] - ${tournament.label} DOESN'T HAVE STANDINGS IN PLACE YET!`
    );

    return null;
  }

  const mappedStandings = await SofascoreStandings.mapStandings(
    data,
    tournamentId,
    tournament.standingsMode
  );
  const query = await SofascoreStandings.createOnDatabase(mappedStandings);

  Profiling.log(
    `[DATA PROVIDER] - [STANDINGS] - CREATING STANDINGS FOR TOURNAMENT ${label}`,
    {
      standings: mappedStandings,
    }
  );

  return query;
};

const update = async (tournamentId: string) => {
  const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const mode = tournament.mode;
  const label = tournament.label;
  const standingsMode = tournament.standingsMode;

  console.log(
    `[LOG] - [DATA PROVIDER] - [STANDINGS] - UPDATING STANDINGS FOR TOURNAMENT ${label}`
  );

  if (mode === 'knockout-only') {
    Profiling.log(
      '[DATA PROVIDER] - [STANDINGS] - KNOCKOUT-ONLY TOURNAMENT DO NOT HAVE STANDINGS'
    );
    return null;
  }

  const data = await SofascoreStandings.fetchStandingsFromProvider(tournament.baseUrl);

  if (!data) {
    Profiling.log(
      `[DATA PROVIDER] - [STANDINGS] - ${tournament.label} DOESN'T HAVE STANDINGS IN PLACE YET!`
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
    `[DATA PROVIDER] - [STANDINGS] - UPDATING STANDINGS FOR TOURNAMENT ${label}`,
    {
      standings: mappedStandings,
    }
  );

  return query;
};

export const StandingsController = {
  create,
  update,
};
