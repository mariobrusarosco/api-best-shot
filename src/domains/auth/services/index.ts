// Auth domain services 
import { Utils } from '@/domains/auth/utils';
import { Response } from 'express';
import { QUERIES_AUTH } from '../queries';

const authenticateUser = async (publicId: string, res: Response) => {
  const member = await QUERIES_AUTH.getMemberByPublicId(publicId);

  if (!member) {
    return null;
  }

  const token = Utils.signUserCookieBased({ memberId: member.id, res });
  return { token, member };
};

const unauthenticateUser = (res: Response) => {
  Utils.clearUserCookie(res);
  return true;
};

export const SERVICES_AUTH = {
  authenticateUser,
  unauthenticateUser,
}; 