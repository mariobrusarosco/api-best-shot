import { Utils } from '@/domains/auth/utils';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { T_LeagueRole } from './schema';

export const isLeagueParticipant = async (req: Request, res: Response, leagueId: string): Promise<boolean> => {
  const memberId = Utils.getAuthenticatedUserId(req, res);
  const [role] = await db
    .select()
    .from(T_LeagueRole)
    .where(and(eq(T_LeagueRole.memberId, memberId), eq(T_LeagueRole.leagueId, leagueId)));

  return !!role;
};
