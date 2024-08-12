import { IMatch, SofaScoreMatchApi } from './typing'
import { isNullable } from '../../../../../utils'

export const mapSofaScoreRoundApi = (
  rawMatch: SofaScoreMatchApi,
  tournamentId: string
): IMatch => {
  return {
    externalId: rawMatch?.id,
    tournamentId,
    roundId: rawMatch?.roundInfo?.round,
    homeTeam: rawMatch?.homeTeam?.nameCode,
    homeScore: rawMatch?.homeScore?.current ?? null,
    awayTeam: rawMatch?.awayTeam?.nameCode,
    awayScore: rawMatch?.awayScore?.current ?? null,
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
    awayScore: isNullable(match.awayScore) ? null : String(match.awayScore),
    homeScore: isNullable(match.homeScore) ? null : String(match.homeScore)
  }
}
