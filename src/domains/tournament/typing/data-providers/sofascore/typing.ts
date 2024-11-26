export type IMatch = {
  externalId: number
  roundId: number
  tournamentId: string
  home: {
    id: number
    name: string
    shortName: string
    nameCode: string
    score: number | null
    externalId: number
  }
  away: {
    id: number
    name: string
    shortName: string
    nameCode: string
    score: number | null
    externalId: number
  }
  date: Date | null
  status?: string
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

const METADATA = {
  BRASILEIRAO_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/325/season/58766/events/round',
    externalId: 325,
    seasonId: 58766
  },
  LALIGA_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/8/season/61643/events/round',
    externalId: 8,
    seasonId: 61643
  },
  PREMIER_LEAGUE_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/17/season/61627/events/round',
    externalId: 17,
    seasonId: 61627
  },
  BUNDESLIGA_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/35/season/63516/events/round',
    externalId: 35,
    seasonId: 63516
  },
  SERIE_A_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/23/season/63515/events/round',
    externalId: 23,
    seasonId: 63515
  },
  CONMEBOL_QUALIFIERS_26: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/295/season/53820/events/round',
    externalId: 295,
    seasonId: 53820
  }
}
