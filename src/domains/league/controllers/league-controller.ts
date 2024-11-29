import { TLeague, TLeagueRole } from '@/domains/league/schema';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

const getLeagues = async (req: Request, res: Response) => {
  const memberId = (req?.query?.memberId || '') as string;

  try {
    const memberLeages = await db
      .select({
        label: TLeague.label,
        description: TLeague.description,
        id: TLeague.id,
      })
      .from(TLeague)
      .innerJoin(TLeagueRole, eq(TLeague.id, TLeagueRole.leagueId))
      .where(eq(TLeagueRole.memberId, memberId));

    return res.status(200).send(memberLeages);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
};

const createLeague = async (req: Request, res: Response) => {
  const { label, description, founderId } = req.body;

  try {
    const query = await db
      .insert(TLeague)
      .values({
        label,
        description,
        founderId,
      })
      .returning();

    const league = query.at(0);

    if (!league) {
      return res.status(400).send({ message: 'League not created' });
    }

    await db.insert(TLeagueRole).values({
      leagueId: league.id,
      memberId: founderId,
      role: 'ADMIN',
    });

    return res.status(201).send(league);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
};

const inviteToLeague = async (req: Request, res: Response) => {
  const { leagueId, guestId } = req.body;

  try {
    await db
      .insert(TLeagueRole)
      .values({
        leagueId,
        memberId: guestId,
        role: 'GUEST',
      })
      .returning();

    return res.status(201).send('user invited to league');
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
};

const LeagueController = {
  getLeagues,
  createLeague,
  inviteToLeague,
};

export default LeagueController;
