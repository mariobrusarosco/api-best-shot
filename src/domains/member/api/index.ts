import { ErrorMapper } from '@/domains/auth/error-handling/mapper';
import { Utils } from '@/domains/auth/utils';

import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';
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
    Logger.error(error as Error, {
      domain: DOMAINS.MEMBER,
      component: 'api',
      operation: 'getMemberV2',
    });
    return handleInternalServerErrorResponse(res, error);
  }
};

const createMember = async (req: Request, res: Response) => {
  try {
    // Log incoming request for debugging
    Logger.info('Create member request received', {
      domain: DOMAINS.MEMBER,
      component: 'api',
      operation: 'createMember',
      contentType: req.get('content-type'),
      bodyKeys: req.body ? Object.keys(req.body) : [],
      bodyPresent: !!req.body,
      bodyType: typeof req.body,
    });

    // Validate request body
    const validationResult = createMemberSchema.safeParse(req.body);
    const hasValidationError = !validationResult.success;

    if (hasValidationError) {
      const errors = validationResult.error.format();

      Logger.error(new Error('Validation Error'), {
        domain: DOMAINS.MEMBER,
        component: 'api',
        operation: 'createMember',
        errors: errors as any,
        receivedBody: req.body,
        contentType: req.get('content-type'),
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
    Logger.error(error as Error, {
      domain: DOMAINS.MEMBER,
      component: 'api',
      operation: 'createMember',
    });
    return handleInternalServerErrorResponse(res, error);
  }
};

export const API_MEMBER = {
  getMember,
  getMemberV2,
  createMember,
};
