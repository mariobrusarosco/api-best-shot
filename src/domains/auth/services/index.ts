// Auth domain services
import { Utils } from '@/domains/auth/utils';
import { Response } from 'express';
import { QUERIES_AUTH } from '../queries';
import { ErrorMapper } from '@/domains/auth/error-handling/mapper';

const authenticateUser = async (publicId: string, res: Response) => {
  const member = await QUERIES_AUTH.getMemberByPublicId(publicId);

  if (!member) {
    throw Error('No user found');
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
