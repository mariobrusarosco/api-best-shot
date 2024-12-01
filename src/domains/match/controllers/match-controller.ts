import { ACTIVE_PROVIDER } from '@/domains/data-providers';
import { ErrorMapper } from '@/domains/match/error-handling/mapper';
import { T_Match } from '@/domains/match/schema';
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import { T_Team } from '@/domains/team/schema';
import db from '@/services/database';
import { aliasedTable, and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';

async function getMatchesByTournament(req: Request, res: Response) {
  try {
    const { round, tournamentId } = req?.params as {
      tournamentId: string;
      round: string;
    };

    const homeTeam = aliasedTable(T_Team, 'homeTeam');
    const awayTeam = aliasedTable(T_Team, 'awayTeam');

    const matches = await db
      .select({
        id: T_Match.id,
        round: T_Match.roundId,
        stadium: T_Match.stadium,
        date: T_Match.date,
        home: {
          id: T_Match.homeTeamId,
          score: T_Match.homeScore,
          shortName: homeTeam.shortName,
          badge: homeTeam.badge,
          name: homeTeam.name,
        },
        away: {
          id: T_Match.awayTeamId,
          score: T_Match.awayScore,
          shortName: awayTeam.shortName,
          badge: awayTeam.badge,
          name: awayTeam.name,
        },
        tournament: {
          id: T_Match.tournamentId,
          externalId: T_Match.tournamentExternalId,
        },
      })
      .from(T_Match)
      .leftJoin(homeTeam, eq(T_Match.homeTeamId, homeTeam.externalId))
      .leftJoin(awayTeam, eq(T_Match.awayTeamId, awayTeam.externalId))
      .where(
        and(
          eq(T_Match.tournamentId, tournamentId),
          eq(T_Match.provider, ACTIVE_PROVIDER),
          eq(T_Match.roundId, round)
        )
      );

    if (!matches) {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status);
    }

    res.status(200).send(matches);
  } catch (error: any) {
    // log here: ErrorMapper.INTERNAL_SERVER_ERROR.debug
    console.error('[TOURNAMENT] - [GET MACTHES BY TOURNAMENT]', error);

    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
}

const MatchController = {
  getMatchesByTournament,
};

export default MatchController;
