import { isNullable } from '../../../utils';
import { IMatch, SofaScoreMatchApi } from './typing';

export const mapSofaScoreRoundApi = (
  rawMatch: SofaScoreMatchApi,
  tournamentId: string
): IMatch => {
  return {
    externalId: rawMatch?.id,
    tournamentId,
    roundId: rawMatch?.roundInfo?.round,
    home: {
      id: rawMatch?.homeTeam?.id,
      name: rawMatch?.homeTeam?.name,
      shortName: rawMatch?.homeTeam?.shortName,
      nameCode: rawMatch?.homeTeam?.nameCode,
      score: rawMatch?.homeScore.current ?? null,
      externalId: rawMatch?.homeTeam?.id,
    },
    away: {
      id: rawMatch?.awayTeam?.id,
      name: rawMatch?.awayTeam?.name,
      shortName: rawMatch?.awayTeam?.shortName,
      nameCode: rawMatch?.awayTeam?.nameCode,
      score: rawMatch?.awayScore.current ?? null,
      externalId: rawMatch?.awayTeam?.id,
    },
    date: isNullable(rawMatch.startTimestamp)
      ? null
      : new Date(rawMatch.startTimestamp! * 1000),
    status: rawMatch?.status.type ?? '',
  };
};
