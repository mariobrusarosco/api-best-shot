import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import { QUERIES_MATCH } from '@/domains/match/queries';
import { SCOREBOARD_OPERATION_TYPES } from '@/domains/scoreboard/contracts';
import { QUERIES_SCOREBOARD } from '@/domains/scoreboard/queries';
import { ErrorMapper } from '../error-handling/mapper';
import { QUERIES_LEAGUE } from '../queries';

const getMemberLeagues = async (memberId: string) => {
  return QUERIES_LEAGUE.getMemberLeagues(memberId);
};

const getActiveLeagueTournaments = async (leagueId: string) => {
  return QUERIES_LEAGUE.listActiveLeagueTournaments(leagueId);
};

const getLeagueScore = async (leagueId: string, memberId: string) => {
  const activeLeagueTournaments = await QUERIES_LEAGUE.listActiveLeagueTournaments(leagueId);
  const tournamentIds = activeLeagueTournaments.map(tournament => tournament.tournamentId);
  const points = await QUERIES_TOURNAMENT.getMemberTournamentScoreboardPointsAcrossTournaments(memberId, tournamentIds);
  const [hasMatchesAwaitingScoreboardCalculation, hasInProgressScoreboardExecution] = await Promise.all([
    QUERIES_MATCH.hasMatchesAwaitingScoreboardCalculation({ tournamentIds }),
    QUERIES_SCOREBOARD.hasInProgressExecution({
      tournamentIds,
      operationType: SCOREBOARD_OPERATION_TYPES.APPLY_PENDING_TOURNAMENT,
    }),
  ]);

  return {
    points,
    tournaments: activeLeagueTournaments,
    underCalculation: hasMatchesAwaitingScoreboardCalculation || hasInProgressScoreboardExecution,
  };
};

const createLeague = async (data: { label: string; description: string; founderId: string }) => {
  const league = await QUERIES_LEAGUE.createLeague(data);

  if (!league) {
    throw new Error('League not created');
  }

  await QUERIES_LEAGUE.createLeagueRole({
    leagueId: league.id,
    memberId: data.founderId,
    role: 'admin',
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
    role: 'member',
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
  const isAdmin = memberRole?.league_role.role === 'admin';
  const permissions = {
    edit: isAdmin,
    invite: isAdmin,
    delete: isAdmin,
  };
  const tournaments = await QUERIES_LEAGUE.getLeagueTournaments(leagueId);

  return {
    id: mainQuery[0].league.id,
    label: mainQuery[0].league.label,
    description: mainQuery[0].league.description,
    permissions,
    participants,
    tournaments,
  };
};

const updateLeagueTournaments = async (
  updateInput: { leagueId: string; tournamentId: string; status: 'active' | 'completed' | 'upcoming' }[]
) => {
  return QUERIES_LEAGUE.updateLeagueTournaments(updateInput);
};

const checkMembership = async (memberId: string, leagueId: string): Promise<boolean> => {
  const role = await QUERIES_LEAGUE.getMemberLeagueRole(memberId, leagueId);
  return !!role;
};

export const SERVICES_LEAGUE = {
  getMemberLeagues,
  getActiveLeagueTournaments,
  getLeagueScore,
  createLeague,
  inviteToLeague,
  getLeagueDetails,
  updateLeagueTournaments,
  checkMembership,
};
