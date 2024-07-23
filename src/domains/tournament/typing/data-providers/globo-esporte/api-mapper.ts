import { isNullable } from '../../../../../utils'
import { GloboEsporteApiGame } from './typing'

export const mapGloboEsportApiRound = ({
  matches,
  tournamentId,
  roundId
}: {
  matches: GloboEsporteApiGame[]
  tournamentId: string
  roundId: string
}) => {
  if (!matches) return null

  return matches.map(match => {
    return {
      externalId: String(match.id),
      tournamentId,
      roundId,
      date: match.data_realizacao,
      time: isNullable(match.hora_realizacao) ? '' : match.hora_realizacao,
      homeScore: match?.placar_oficial_mandante,
      awayScore: match.placar_oficial_visitante,
      homeTeam: match.equipes.mandante?.sigla,
      awayTeam: match.equipes.visitante?.sigla,
      stadium: isNullable(match.sede?.nome_popular) ? null : match.sede?.nome_popular,
      gameStarted: isNullable(match.jogo_ja_comecou) ? false : match.jogo_ja_comecou
    }
  })
}
