import { isNullable } from '../../../../../utils'
import { IMatch, SofaScoreMatchApi } from './typing'

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
      score: rawMatch?.homeScore.current ?? null
    },
    away: {
      id: rawMatch?.awayTeam?.id,
      name: rawMatch?.awayTeam?.name,
      shortName: rawMatch?.awayTeam?.shortName,
      nameCode: rawMatch?.awayTeam?.nameCode,
      score: rawMatch?.awayScore.current ?? null
    },
    date: isNullable(rawMatch.startTimestamp)
      ? null
      : new Date(rawMatch.startTimestamp! * 1000),
    status: rawMatch?.status.type ?? ''
  }
}

export const toSQLReady = ({ match }: { match: IMatch }) => {
  return {
    ...match,
    externalId: String(match.externalId),
    roundId: String(match.roundId),
    homeTeamId: String(match.home.id),
    awayTeamId: String(match.away.id),
    awayScore: isNullable(match.away.score) ? null : String(match.away.score),
    homeScore: isNullable(match.home.score) ? null : String(match.home.score)
  }
}
