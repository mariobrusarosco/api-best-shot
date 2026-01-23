import { ErrorMapper } from '../error-handling/mapper';
import { QUERIES_LEAGUE } from '../queries';

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
  getMemberLeagues,
  createLeague,
  inviteToLeague,
  getLeagueDetails,
  updateLeagueTournaments,
};
