import {
  SOFA_MATCHES_API,
  SOFA_TOURNAMENT_API,
} from '@/domains/data-providers/sofascore/metadata';
import { TMatch } from '@/domains/match/schema';
import { TTournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { safeDate, safeString } from '@/utils';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { AppStandingsTeam, IApiProvider } from '../typing';
import { SofaScoreMatchApi, SofaScorestandings } from './typing';

export const ProviderSofa: IApiProvider = {
  tournament: {
    prepareUrl: ({ externalId }) =>
      SOFA_TOURNAMENT_API.replace(':external_id', externalId),
    createOnDB: async data => {
      return db.insert(TTournament).values(data).returning();
    },
    updateOnDB: async data => {
      return db
        .update(TTournament)
        .set(data)
        .where(eq(TTournament.externalId, data.externalId))
        .returning();
    },
    fetchStandings: async (url: string) => {
      const response = await axios.get(url);

      return response.data as SofaScorestandings;
    },
    parseStandings: (data: SofaScorestandings) =>
      data.standings[0]['rows']?.map(team => ProviderSofa.team.parseFromStandings(team)),
  },
  rounds: {
    prepareUrl: ({ externalId, mode, round, season }) => {
      return SOFA_MATCHES_API.replace(':external_id', externalId)
        .replace(':mode', mode)
        .replace(':season', season)
        .replace(':round', String(round));
    },
    fetchRound: async (url: string) => {
      const response = await axios.get(url);

      return response.data as SofaScoreMatchApi[];
    },
  },
  match: {
    parse: data => {
      const match = data.match as SofaScoreMatchApi;
      const tournamentId = data.tournamentId;
      const tournamentExternalId = String(data.tournamentExternalId);
      const roundId = String(data.roundId);

      return {
        externalId: String(match.id),
        provider: 'sofa',
        tournamentId,
        tournamentExternalId,
        roundId,
        homeTeamId: String(match.homeTeam.id),
        homeScore: safeString(match.homeScore.current),
        awayTeamId: String(match.awayTeam.id),
        awayScore: safeString(match.awayScore.current),
        date: safeDate(match.startTimestamp! * 1000),
        status: match.status.code !== 0 ? 'started' : 'not-started',
      };
    },
    insertMatchesOnDB: async matches => {},
    updateMatchesOnDB: async matches => {
      return await db.transaction(async tx => {
        for (const match of matches) {
          await tx
            .update(TMatch)
            .set(match)
            .where(eq(TMatch.externalId, match.externalId));
        }
      });
    },
  },
  team: {
    parseFromStandings: (team: SofaScorestandings['standings'][number]['rows'][number]) =>
      ({
        externalId: String(team?.id),
        matches: team.matches,
        position: team.position,
        wins: team.wins,
        points: team.points,
      } satisfies AppStandingsTeam),
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
