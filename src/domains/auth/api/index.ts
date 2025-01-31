import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import { Request, Response } from 'express';
import { AuthenticateMemberRequest } from '../typing';
import { SERVICES_AUTH } from '../services';

const authenticateUser = async (req: AuthenticateMemberRequest, res: Response) => {
  try {
    const { publicId } = req.body;
    const result = await SERVICES_AUTH.authenticateUser(publicId, res);

    if (!result) {
      return res
        .status(404)
        .send({ message: 'No user found to authenticate' });
    }

    return res.status(200).send(result.token);
  } catch (error: any) {
    console.error(`[AUTH - authenticateUser] ${error}`);
    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
};

const unauthenticateUser = (req: Request, res: Response) => {
  try {
    SERVICES_AUTH.unauthenticateUser(res);
    return res.status(200).send({ message: 'Successfully logged out' });
  } catch (error: any) {
    console.error(`[AUTH - unauthenticateUser] ${error}`);
    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
};

export const API_AUTH = {
  authenticateUser,
  unauthenticateUser,
};
