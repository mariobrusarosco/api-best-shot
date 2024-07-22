import fs from 'fs'
import { ApiRound } from '../typing/typing'

export const mapRound = (round: ApiRound) => {
  const roundId = round.id
  const roundGames = round.content

  const normalizedMatches = roundGames.map(game => {
    return {
      externalId: game.id,
      date: game.data_realizacao,
      time: game.hora_realizacao,
      homeScore: game?.placar_oficial_mandante,
      awayScore: game.placar_oficial_visitante,
      homeTeam: game.equipes.mandante?.sigla,
      awayTeam: game.equipes.visitante?.sigla,
      stadium: game.sede?.nome_popular,
      gameStarted: game.jogo_ja_comecou
    }
  })

  return {
    id: roundId,
    matches: normalizedMatches
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
