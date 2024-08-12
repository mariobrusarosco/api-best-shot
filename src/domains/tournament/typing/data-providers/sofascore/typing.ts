// Reference https://www.sofascore.com/api/v1/unique-tournament/325/season/58766/events/round/22

import { unique } from 'drizzle-orm/mysql-core'

export type IMatch = {
  externalId: number
  roundId: number
  tournamentId: string
  homeTeam: string
  awayTeam: string
  date: Date | null
  status?: string
  awayScore: number | null
  homeScore: number | null
}

export type SofaScoreMatchApi = {
  id: number
  slug: string
  roundInfo: {
    round: number
  }
  startTimestamp: number | null
  tournament: {
    uniqueTournament: {
      id: number
    }
  }
  status: {
    description: string
    type: string
    code: number
  }
  winnerCode: number | null
  homeTeam: {
    id: number
    name: string
    shortName: string
    slug: string
    nameCode: string
    teamColors: {
      primary: string
      secondary: string
      text: string
    }
  }
  awayTeam: {
    id: number
    name: string
    shortName: string
    slug: string
    nameCode: string
    teamColors: {
      primary: string
      secondary: string
      text: string
    }
  }
  homeScore: {
    current: number
    display: number
    period1: number
    period2: number
    normaltime: number
  }
  awayScore: {
    current: number
    display: number
    period1: number
    period2: number
    normaltime: number
  }
}

export type SofaScoreRoundApi = {
  events: SofaScoreMatchApi[]
  hasPreviousPage: boolean
}
