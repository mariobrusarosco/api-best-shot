import { Utils } from '@/domains/auth/utils';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Request, Response } from 'express';
import { SERVICES_PERFORMANCE_V2 } from '@/domains/performance/services';
import Profiling from '@/services/profiling';
import { MemberService } from '../services';
import { CreateMemberInput } from './typing';

const getMember = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const member = await MemberService.getMemberById(memberId);

    if (!member) {
      return res.status(404).send({ message: 'Member not found' });
    }

    return res.status(200).send(member);
  } catch (error: any) {
    console.error('[ERROR] [getMember]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getMemberV2 = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const member = await MemberService.getMemberById(memberId);

    if (!member) {
      return res.status(404).send({ message: 'Member not found' });
    }

    return res.status(200).send(member);
  } catch (error: any) {
    Profiling.error('[API_MEMBER]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const createMember = async (req: Request, res: Response) => {
  try {
    const input: CreateMemberInput = req.body;
    const member = await MemberService.createMember(input);

    if (!member) {
      return res.status(400).send({ message: 'Failed to create member' });
    }

    return res.status(201).send(member);
  } catch (error: any) {
    console.error('[ERROR] [createMember]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getGeneralTournamentPerformance = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const performance = await MemberService.getGeneralTournamentPerformance(memberId);
    return res.status(200).send(performance);
  } catch (error: any) {
    console.error('[ERROR] [getGeneralTournamentPerformance]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getGeneralTournamentPerformanceV2 = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const performance = await MemberService.getGeneralTournamentPerformanceV2(memberId);
    return res.status(200).send(performance);
  } catch (error: any) {
    Profiling.error('[API_MEMBER]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getMemberPerformanceForAllTournaments = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const bestAndWorstPerformance =
      await SERVICES_PERFORMANCE_V2.tournament.getMemberBestAndWorstPerformance(memberId);

    res.status(200).send(bestAndWorstPerformance);
    return;
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    handleInternalServerErrorResponse(res, error);
    return;
  }
};

export const API_MEMBER = {
  getMember,
  getMemberV2,
  createMember,
  getGeneralTournamentPerformance,
  getGeneralTournamentPerformanceV2,
  getMemberPerformanceForAllTournaments,
};
