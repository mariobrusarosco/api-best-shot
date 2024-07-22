import { globoEsporteApiGame, globoEsporteApiRound } from './data-providers/globo-esporte'

export type IGame = {
  id: number
  date: string
  time: string
  homeScore: number | null
  awayScore: number | null
  homeTeam: string
  awayTeam: string
  stadium: string
}
export type ApiGame = globoEsporteApiGame

export type IRound = {
  id: number
  games: IGame[]
}
export type ApiRound = globoEsporteApiRound
