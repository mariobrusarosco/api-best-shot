import { Request } from 'express';

export type AuthenticateMemberRequest = Request<{}, {}, { publicId: string }, {}>;


export enum PROFILLING_AUTH {
  AUTHENTICATE_USER = '[AUTH] Authenticate User',
  UNAUTHENTICATE_USER = '[AUTH] Unauthenticate User',
}


