import { Request, Response } from 'express';
import { SERVICES_LEAGUE } from '../services';
import { SERVICES_PERFORMANCE_V2 } from '@/domains/performance/services';
import { Utils } from '@/domains/auth/utils';
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import { isLeagueParticipant } from '../utils';
import { ErrorMapper } from '../error-handling/mapper';

type GetLeagueStandingsParams = {
  leagueId: string;
};

const getLeagueStandings = async (
  req: Request<GetLeagueStandingsParams>,
  res: Response
) => {
  const { leagueId } = req.params;
  const standings = await SERVICES_LEAGUE.getLeagueStandings(leagueId);
  const lastUpdated = await SERVICES_LEAGUE.getLeaguePerformanceLastUpdated(leagueId);

  return res.status(200).send({ standings, lastUpdated });
};

const updateLeaguePerformance = async (req: Request, res: Response) => {
  const { leagueId } = req.params;
  const performance =
    await SERVICES_PERFORMANCE_V2.league.updateLeaguePerformance(leagueId);

  return res.status(200).send(performance);
};

const getLeagues = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const leagues = await SERVICES_LEAGUE.getMemberLeagues(memberId);
    return res.status(200).send(leagues);
  } catch (error: any) {
    console.error(`[LEAGUE - getLeagues] ${error}`);
    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
};

const createLeague = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const { label, description } = req.body;

    const league = await SERVICES_LEAGUE.createLeague({
      label,
      description,
      founderId: memberId,
    });

    return res.status(201).send(league);
  } catch (error: any) {
    console.error(`[LEAGUE - createLeague] ${error}`);
    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
};

const inviteToLeague = async (req: Request, res: Response) => {
  try {
    const { leagueId, guestId } = req.body;
    await SERVICES_LEAGUE.inviteToLeague({ leagueId, guestId });
    return res.status(201).send('user invited to league');
  } catch (error: any) {
    if (error === ErrorMapper.NOT_APP_MEMBER) {
      return res.status(error.status).send(error.user);
    }
    console.error(`[LEAGUE - inviteToLeague] ${error}`);
    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
};

const getLeague = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const { leagueId } = req.params;

    try {
      const isParticipant = await isLeagueParticipant(req, res, leagueId);
      if (!isParticipant) {
        return res
          .status(ErrorMapper.NOT_LEAGUE_MEMBER.status)
          .send(ErrorMapper.NOT_LEAGUE_MEMBER.user);
      }

      const leagueDetails = await SERVICES_LEAGUE.getLeagueDetails(leagueId, memberId);
      return res.status(200).send(leagueDetails);
    } catch (error) {
      if (
        error === ErrorMapper.LEAGUE_NOT_FOUND ||
        (error && typeof error === 'object' && 'status' in error && 'user' in error)
      ) {
        return res
          .status(ErrorMapper.LEAGUE_NOT_FOUND.status)
          .send(ErrorMapper.LEAGUE_NOT_FOUND.user);
      }
      throw error;
    }
  } catch (error: any) {
    console.error(`[LEAGUE - getLeague] ${error}`);
    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
};

const updateLeagueTournaments = async (req: Request, res: Response) => {
  try {
    const { updateInput } = req.body;
    const result = await SERVICES_LEAGUE.updateLeagueTournaments(updateInput);
    return res.status(200).send(result);
  } catch (error: any) {
    console.error(`[LEAGUE - updateLeagueTournaments] ${error}`);
    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
};

export const API_LEAGUE = {
  getLeagueStandings,
  updateLeaguePerformance,
  getLeagues,
  createLeague,
  inviteToLeague,
  getLeague,
  updateLeagueTournaments,
};
