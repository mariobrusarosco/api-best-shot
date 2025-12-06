import { ErrorMapper } from '@/domains/auth/error-handling/mapper';
import { Utils } from '@/domains/auth/utils';
import { SERVICES_PERFORMANCE_V2 } from '@/domains/performance/services';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Request, Response } from 'express';
import { MemberService } from '../services';
import { createMemberSchema } from './schemas';

const getMember = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const member = await MemberService.getMemberById(memberId);

    if (!member) {
      return res.status(404).send({ message: 'Member not found' });
    }

    return res.status(200).send(member);
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    Profiling.error({
      source: 'MEMBER_API_getMemberV2',
      error,
    });
    return handleInternalServerErrorResponse(res, error);
  }
};

const createMember = async (req: Request, res: Response) => {
  try {
    // Log incoming request for debugging
    Profiling.log({
      msg: 'Create member request received',
      source: 'MEMBER_API_createMember_request',
      data: {
        contentType: req.get('content-type'),
        bodyKeys: req.body ? Object.keys(req.body) : [],
        bodyPresent: !!req.body,
        bodyType: typeof req.body,
      },
    });

    // Validate request body
    const validationResult = createMemberSchema.safeParse(req.body);
    const hasValidationError = !validationResult.success;

    if (hasValidationError) {
      const errors = validationResult.error.format();

      Profiling.error({
        source: 'MEMBER_API_createMember',
        error: errors,
        data: {
          receivedBody: req.body,
          contentType: req.get('content-type'),
        },
      });

      return res.status(ErrorMapper.VALIDATION_ERROR.status).send({
        message: ErrorMapper.VALIDATION_ERROR.user,
        errors,
        hint: 'Required fields: publicId (string), email (valid email string), nickName (string). Optional: firstName, lastName, password.',
        receivedBody: req.body || null,
      });
    }

    const member = await MemberService.createMember(validationResult.data);

    if (!member) {
      return res.status(400).send({ message: 'Failed to create member' });
    }

    return res.status(201).send(member);
  } catch (error: unknown) {
    Profiling.error({
      source: 'MEMBER_API_createMember',
      error,
    });
    return handleInternalServerErrorResponse(res, error);
  }
};

const getGeneralTournamentPerformance = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const performance = await MemberService.getGeneralTournamentPerformance(memberId);
    return res.status(200).send(performance);
  } catch (error: unknown) {
    console.error('[ERROR] [getGeneralTournamentPerformance]', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getGeneralTournamentPerformanceV2 = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const performance = await MemberService.getGeneralTournamentPerformanceV2(memberId);
    return res.status(200).send(performance);
  } catch (error: unknown) {
    Profiling.error({
      source: 'MEMBER_API_getGeneralTournamentPerformanceV2',
      error,
    });
    return handleInternalServerErrorResponse(res, error);
  }
};

const getMemberPerformanceForAllTournaments = async (req: Request, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const bestAndWorstPerformance = await SERVICES_PERFORMANCE_V2.tournament.getMemberBestAndWorstPerformance(memberId);

    res.status(200).send(bestAndWorstPerformance);
    return;
  } catch (error: unknown) {
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
