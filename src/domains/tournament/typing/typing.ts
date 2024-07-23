import {
  GloboEsporteApiGame,
  GloboEsporteApiRound
} from './data-providers/globo-esporte/typing'

export type TournamentMode = 'kill-kill' | 'running-points'

export type ISqlMatch = {
  roundId: string
  tournamentId: string
  date: Date | null
  time: string | null
  externalId: string
  gameStarted: boolean
  homeScore: string | null
  awayScore: string | null
  homeTeam: string
  awayTeam: string
  stadium: string
}

export type IClientMatch = {
  roundId: string
  tournamentId: string
  date: Date | null
  time: string | null
  externalId: string
  gameStarted: boolean
  homeScore: number | null
  awayScore: number | null
  homeTeam: string
  awayTeam: string
  stadium: string
}

export type ApiGame = GloboEsporteApiGame

export type IRound = {
  id: number
  matches: IClientMatch[]
}
export type ApiRound = GloboEsporteApiRound
