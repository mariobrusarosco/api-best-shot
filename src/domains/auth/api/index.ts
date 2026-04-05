import { Request, Response } from 'express';
import { AuthenticateMemberRequest } from '../typing';
import { SERVICES_AUTH } from '../services';
import { z } from 'zod';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { ErrorMapper } from '../error-handling/mapper';

const authenticateUser = async (req: AuthenticateMemberRequest, res: Response) => {
  try {
    // Validate request body
    const validationResult = authenticateUserSchema.safeParse(req.body);
    const hasValidationError = !validationResult.success;

    if (hasValidationError) {
      const errors = validationResult.error.format();

      Logger.error(new Error('Validation Error'), {
        domain: DOMAINS.AUTH,
        component: 'api',
        operation: 'authenticate',
        errors: JSON.stringify(errors),
      });

      return res.status(ErrorMapper.VALIDATION_ERROR.status).send({
        message: ErrorMapper.VALIDATION_ERROR.user,
      });
    }

    // Extract validated data
    const { publicId } = validationResult.data;
    const result = await SERVICES_AUTH.authenticateUser(publicId, res);

    if (!result) {
      return res.status(ErrorMapper.USER_NOT_FOUND.status).send({ message: ErrorMapper.USER_NOT_FOUND.user });
    }

    return res.status(200).send(result.token);
  } catch (error: unknown) {
    Logger.error(error as Error, {
      domain: DOMAINS.AUTH,
      component: 'api',
      operation: 'authenticate',
    });

    return res.status(ErrorMapper.USER_NOT_FOUND.status).send({
      message: ErrorMapper.USER_NOT_FOUND.user,
    });
  }
};

type Auth0AuthenticatedRequest = Request & {
  auth?: {
    payload?: {
      sub?: string;
    };
  };
};

const authenticateUserWithAuth0Proof = async (req: Auth0AuthenticatedRequest, res: Response) => {
  try {
    const auth0Subject = req.auth?.payload?.sub;

    if (!auth0Subject) {
      Logger.error(new Error('Missing Auth0 subject after token validation'), {
        domain: DOMAINS.AUTH,
        component: 'api',
        operation: 'authenticateUserWithAuth0Proof',
      });

      return res
        .status(GlobalErrorMapper.NOT_AUTHORIZED.status)
        .send({ message: GlobalErrorMapper.NOT_AUTHORIZED.userMessage });
    }

    const result = await SERVICES_AUTH.authenticateUserWithAuth0Subject(auth0Subject, res);

    if (!result) {
      return res.status(ErrorMapper.USER_NOT_FOUND.status).send({ message: ErrorMapper.USER_NOT_FOUND.user });
    }

    return res.status(200).send(result.token);
  } catch (error: unknown) {
    Logger.error(error as Error, {
      domain: DOMAINS.AUTH,
      component: 'api',
      operation: 'authenticateUserWithAuth0Proof',
    });

    return res.status(ErrorMapper.USER_NOT_FOUND.status).send({
      message: ErrorMapper.USER_NOT_FOUND.user,
    });
  }
};

const unauthenticateUser = (_: Request, res: Response) => {
  try {
    SERVICES_AUTH.unauthenticateUser(res);
    Logger.info('Successfully logged out', {
      domain: DOMAINS.AUTH,
      component: 'api',
    });
    return res.status(200).send({ message: 'Successfully logged out' });
  } catch (error: unknown) {
    Logger.error(error as Error, {
      domain: DOMAINS.AUTH,
      component: 'api',
      operation: 'unauthenticateUser',
    });
    return handleInternalServerErrorResponse(res, error);
  }
};

export const API_AUTH = {
  authenticateUser,
  authenticateUserWithAuth0Proof,
  unauthenticateUser,
};

const authenticateUserSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required'),
});
