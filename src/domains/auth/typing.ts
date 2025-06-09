import { Request } from 'express';

export type AuthenticateMemberRequest = Request<
  Record<string, never>,
  Record<string, never>,
  { publicId: string },
  Record<string, never>
>;
