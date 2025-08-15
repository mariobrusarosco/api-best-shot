import { AuthenticateMemberRequest } from '@/domains/auth/typing';
import { Request } from 'express';
import { DB_InsertMember } from '../schema';

export type CreateMemberInput = Omit<
  DB_InsertMember,
  'id' | 'createdAt' | 'updatedAt' | 'role'
>;

export type CreateMemberRequest = Request<
  Record<string, never>,
  Record<string, never>,
  CreateMemberInput,
  AuthenticateMemberRequest['query']
>;
