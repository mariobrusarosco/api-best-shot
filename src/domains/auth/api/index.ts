import { Request, Response } from 'express';
import { AuthenticateMemberRequest } from '../typing';
import { SERVICES_AUTH } from '../services';
import { z } from 'zod';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Profiling } from '@/services/profiling';
import { ErrorMapper } from '../error-handling/mapper';

const authenticateUser = async (req: AuthenticateMemberRequest, res: Response) => {
  try {
    // Validate request body
    const validationResult = authenticateUserSchema.safeParse(req.body);
    const hasValidationError = !validationResult.success;

    if (hasValidationError) {
      const errors = validationResult.error.format();

      Profiling.error({
        source: 'AUTH_API_authenticateUser',
        error: errors,
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
    Profiling.error({
      source: 'AUTH_API_authenticateUser',
      error,
    });

    return res.status(ErrorMapper.USER_NOT_FOUND.status).send({
      message: ErrorMapper.USER_NOT_FOUND.user,
    });
  }
};

const unauthenticateUser = (_: Request, res: Response) => {
  try {
    SERVICES_AUTH.unauthenticateUser(res);
    Profiling.log({
      msg: 'Successfully logged out',
      source: 'AUTH_API_unauthenticateUser',
    });
    return res.status(200).send({ message: 'Successfully logged out' });
  } catch (error: unknown) {
    Profiling.error({
      source: 'AUTH_API_unauthenticateUser',
      error,
    });
    return handleInternalServerErrorResponse(res, error);
  }
};

export const API_AUTH = {
  authenticateUser,
  unauthenticateUser,
};

const authenticateUserSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required'),
});
