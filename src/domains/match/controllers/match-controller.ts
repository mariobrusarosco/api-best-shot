import { ErrorMapper } from '@/domains/match/error-handling/mapper';
import { T_Match } from '@/domains/match/schema';
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import { T_Team } from '@/domains/team/schema';
import { TournamentRoundsQueries } from '@/domains/tournament-round/queries';
import db from '@/services/database';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { aliasedTable, and, eq, sql } from 'drizzle-orm';
import { Request, Response } from 'express';

const homeTeam = aliasedTable(T_Team, 'homeTeam');
const awayTeam = aliasedTable(T_Team, 'awayTeam');

dayjs.extend(relativeTime);

const defineTimebox = (matchDate: string) => dayjs(matchDate).fromNow();

async function getMatchesByTournament(req: Request, res: Response) {
  try {
    const { roundId, tournamentId } = req?.params as {
      tournamentId: string;
      roundId: string;
    };

    const round = await TournamentRoundsQueries.getRound({
      tournamentId,
      roundSlug: roundId,
    });

    if (!round || !round.slug) {
      return res
        .status(ErrorMapper.INVALID_ROUND.status)
        .send(ErrorMapper.INVALID_ROUND.status);
    }

    const matches = await db
      .select({
        id: T_Match.id,
        round: T_Match.roundSlug,
        stadium: T_Match.stadium,
        date: T_Match.date,
        home: {
          id: T_Match.homeTeamId,
          score: T_Match.homeScore,
          penaltiesScore: T_Match.homePenaltiesScore,
          shortName: homeTeam.shortName,
          badge: homeTeam.badge,
          name: homeTeam.name,
        },
        away: {
          id: T_Match.awayTeamId,
          score: T_Match.awayScore,
          penaltiesScore: T_Match.awayPenaltiesScore,
          shortName: awayTeam.shortName,
          badge: awayTeam.badge,
          name: awayTeam.name,
        },
        tournament: {
          id: T_Match.tournamentId,
        },
        status: T_Match.status,
        timebox: sql<string>`${T_Match.date}`.mapWith(defineTimebox),
      })
      .from(T_Match)
      .leftJoin(homeTeam, eq(T_Match.homeTeamId, homeTeam.externalId))
      .leftJoin(awayTeam, eq(T_Match.awayTeamId, awayTeam.externalId))
      .where(
        and(
          eq(T_Match.tournamentId, tournamentId),
          eq(T_Match.provider, 'sofa'),
          eq(T_Match.roundSlug, round?.slug ?? '')
        )
      );

    if (!matches) {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status);
    }

    res.status(200).send(matches);
  } catch (error: any) {
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
