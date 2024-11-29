import {
  SOFA_MATCHES_API,
  SOFA_TOURNAMENT_API,
} from '@/domains/data-providers/sofascore/metadata';
import { TTournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { eq } from 'drizzle-orm';
import { IApiProvider } from '../typing';

export const ProviderSofa: IApiProvider = {
  getURL: data =>
    SOFA_MATCHES_API.replace(':external_id', data.externalId)
      .replace(':mode', data.mode)
      .replace(':slug', data.slug)
      .replace(':round', String(data.round)),
  tournament: {
    prepareUrl: ({ externalId }) =>
      SOFA_TOURNAMENT_API.replace(':external_id', externalId),
    createOnDB: async data => {
      return db.insert(TTournament).values(data).returning();
    },
    updateOnDB: async data => {
      const { id: _, ...rest } = data;
      return db
        .update(TTournament)
        .set(rest)
        .where(eq(TTournament.externalId, data.externalId))
        .returning();
    },
  },
};

// export const mapSofaScoreRoundApi = (
//   rawMatch: SofaScoreMatchApi,
//   tournamentId: string
// ): IMatch => {
//   return {
//     externalId: rawMatch?.id,
//     tournamentId,
//     roundId: rawMatch?.roundInfo?.round,
//     home: {
//       id: rawMatch?.homeTeam?.id,
//       name: rawMatch?.homeTeam?.name,
//       shortName: rawMatch?.homeTeam?.shortName,
//       nameCode: rawMatch?.homeTeam?.nameCode,
//       score: rawMatch?.homeScore.current ?? null,
//       externalId: rawMatch?.homeTeam?.id,
//     },
//     away: {
//       id: rawMatch?.awayTeam?.id,
//       name: rawMatch?.awayTeam?.name,
//       shortName: rawMatch?.awayTeam?.shortName,
//       nameCode: rawMatch?.awayTeam?.nameCode,
//       score: rawMatch?.awayScore.current ?? null,
//       externalId: rawMatch?.awayTeam?.id,
//     },
//     date: isNullable(rawMatch.startTimestamp)
//       ? null
//       : new Date(rawMatch.startTimestamp! * 1000),
//     status: rawMatch?.status.type ?? '',
//   };
// };
