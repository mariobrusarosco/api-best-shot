import { SofascoreStandings } from '../providers/sofascore/sofascore-standings';

const Api = SofascoreStandings;

const setupStandings = async (baseUrl: string, tournamentId: string) => {
  try {
    const standings = await Api.fetchStandings(baseUrl);
    const mappedStandings = await Api.mapStandings(standings, tournamentId);
    const query = await Api.createOnDatabase(mappedStandings);

    return query;
  } catch (error: any) {
    console.error('[ERROR] - setupStandings');
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);

    if (error.response.status === 404) {
      console.error(
        `[STANDINGS] - tournament: ${tournamentId} does not have a standings in place`
      );
    }
  }
};

const updateStandings = async (baseUrl: string, tournamentId: string) => {
  try {
    const standings = await Api.fetchStandings(baseUrl);
    const mappedStandings = await Api.mapStandings(standings, tournamentId);
    const query = await Api.updateOnDatabase(mappedStandings);

    return query;
  } catch (error: any) {
    console.error('[ERROR] - setupStandings');
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);

    if (error.response.status === 404) {
      console.error(
        `[STANDINGS] - tournament: ${tournamentId} does not have a standings in place`
      );
    }
  }
};

export const StandingsDataController = {
  setupStandings,
  updateStandings,
};
