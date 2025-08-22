import { QUERIES_PERFORMANCE } from '@/domains/performance/queries';
import { QUERIES_LEAGUE } from '../queries';
import { ErrorMapper } from '../error-handling/mapper';

const getLeagueStandings = async (leagueId: string) => {
  const query = await QUERIES_PERFORMANCE.league.getPerformance(leagueId);

  const standings = query.reduce(
    (
      acc: Record<string, { id: string; logo: string; members: { member: string; points: string }[] }>,
      tournament: (typeof query)[number]
    ) => {
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
    },
    {}
  );

  return standings;
};

const getLeaguePerformanceLastUpdated = async (leagueId: string) => {
  const query = await QUERIES_PERFORMANCE.league.getPerformanceLastUpdated(leagueId);
  return query?.updatedAt;
};

const getMemberLeagues = async (memberId: string) => {
  return QUERIES_LEAGUE.getMemberLeagues(memberId);
};

const createLeague = async (data: { label: string; description: string; founderId: string }) => {
  const league = await QUERIES_LEAGUE.createLeague(data);

  if (!league) {
    throw new Error('League not created');
  }

  await QUERIES_LEAGUE.createLeagueRole({
    leagueId: league.id,
    memberId: data.founderId,
    role: 'ADMIN',
  });

  await QUERIES_LEAGUE.createLeaguePerformance({
    leagueId: league.id,
    memberId: data.founderId,
    points: '0',
  });

  return league;
};

const inviteToLeague = async (data: { leagueId: string; guestId: string }) => {
  const member = await QUERIES_LEAGUE.getMemberById(data.guestId);

  if (!member) {
    throw ErrorMapper.NOT_APP_MEMBER;
  }

  await QUERIES_LEAGUE.createLeagueRole({
    leagueId: data.leagueId,
    memberId: data.guestId,
    role: 'GUEST',
  });

  await QUERIES_LEAGUE.createLeaguePerformance({
    leagueId: data.leagueId,
    memberId: data.guestId,
    points: '0',
  });

  return true;
};

const getLeagueDetails = async (leagueId: string, memberId: string) => {
  const mainQuery = await QUERIES_LEAGUE.getLeagueDetails(leagueId);

  if (!mainQuery || mainQuery.length === 0) {
    throw ErrorMapper.LEAGUE_NOT_FOUND;
  }

  const participants = mainQuery.map((row: (typeof mainQuery)[number]) => ({
    role: row.league_role.role,
    nickName: row.member.nickName,
  }));

  const memberRole = mainQuery.find((row: (typeof mainQuery)[number]) => row.league_role.memberId === memberId);
  const permissions = {
    edit: memberRole?.league_role.role === 'ADMIN',
    invite: memberRole?.league_role.role === 'ADMIN',
    delete: memberRole?.league_role.role === 'ADMIN',
  };

  const tournamentsQuery = await QUERIES_LEAGUE.getLeagueTournaments(leagueId);
  const tournaments = tournamentsQuery.map((row: (typeof tournamentsQuery)[number]) => row.tournament);

  return {
    id: mainQuery[0].league.id,
    label: mainQuery[0].league.label,
    description: mainQuery[0].league.description,
    permissions,
    participants,
    tournaments,
  };
};

const updateLeagueTournaments = async (updateInput: { leagueId: string; tournamentId: string; status: string }[]) => {
  return QUERIES_LEAGUE.updateLeagueTournaments(updateInput);
};

export const SERVICES_LEAGUE = {
  getLeagueStandings,
  getLeaguePerformanceLastUpdated,
  getMemberLeagues,
  createLeague,
  inviteToLeague,
  getLeagueDetails,
  updateLeagueTournaments,
};
