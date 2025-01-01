import { Request } from 'express';
import { DB_InsertMember } from '../schema';

export type CreateMemberRequest = Request<null, CreateMemberInput>;

export type CreateMemberInput = Omit<DB_InsertMember, 'id' | 'createdAt' | 'updatedAt'>;
