import { QUERIES_PERFORMANCE } from "@/domains/performance/queries";


const getLeagueStandings = async (leagueId: string) => {
   const query = await QUERIES_PERFORMANCE.getLeaguePerformance(leagueId);

   const standings = query.reduce<
    Record<
      string,
      { id: string; logo: string; members: { member: string; points: string }[] }
    >
  >((acc, tournament) => {
    const id = tournament.id || '';
    const logo = tournament.logo || '';
    const points = tournament.points || '';
    const member = tournament.member || '';

    if (id && !acc[id]) {
      acc[id] = {
        
        id,
        logo: logo,
        members: [],
      };
    }

    if (tournament.member && tournament.points) {
      acc[id].members.push({ member: member as string, points: points as string });
    }
    return acc;
  }, {});   

  return standings;
}

const getLeaguePerformanceLastUpdated = async (leagueId: string) => {
  const query = await QUERIES_PERFORMANCE.getLeaguePerformanceLastUpdated(leagueId);
  return query?.updatedAt;
}

export const SERVICES_LEAGUE = {
    getLeagueStandings,
    getLeaguePerformanceLastUpdated
}

