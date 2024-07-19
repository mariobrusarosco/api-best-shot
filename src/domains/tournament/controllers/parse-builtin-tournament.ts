import fs from 'fs'
import axios from 'axios'
import { RawSerieARound } from '../typing'

export const mapBrazilianSerieARound = (round: RawSerieARound) => {
  const games = round.content
  const mappedGames = games.map(game => {
    return {
      id: game.id,
      date: game.data_realizacao,
      time: game.hora_realizacao,
      homeScore: game.placar_oficial_mandante,
      awayScore: game.placar_oficial_visitante,
      homeTeam: game.equipes.mandante.nome_popular,
      awayTeam: game.equipes.visitante.nome_popular,
      stadium: game.sede.nome_popular
    }
  })

  return {
    id: round.id,
    games: mappedGames
  }
}

export const parseBuiltInTournament = (id: string) => {
  try {
    const fileContent = fs.readFileSync(`src/external-data/${id}.json`, 'utf8')

    return JSON.parse(fileContent)
  } catch (error: any) {
    console.error('[FILE SYSTEM] Error when parsing builtin tournament', error)
  }
}
