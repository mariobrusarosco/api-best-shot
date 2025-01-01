import { Request } from 'express';

export type AuthenticateMemberRequest = Request<{}, {}, {}, { publicId: string }>;
