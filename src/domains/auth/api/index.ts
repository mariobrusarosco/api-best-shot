import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Request, Response } from 'express';
import { Utils } from '../utils';

const unauthenticateUser = async (req: Request, res: Response) => {
  try {
    Utils.clearUserCookie(res);

    return res.status(200).send('User unauthenticated');
  } catch (error: any) {
    console.error(`[AUTH - DELETE] ${error}`);
    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Auth = {
  unauthenticateUser,
};
