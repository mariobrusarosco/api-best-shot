import { InsertMatch, TMatch } from '@/domains/match/schema'
import { SelectTournament } from '@/domains/tournament/schema'
import db from '@/services/database'
import { GloboEsporteApiMatch } from './typing'

// export const mapGloboEsportApiRound = ({
//   matches,
//   tournamentId,
//   roundId
// }: {
//   matches: GloboEsporteApiMatch[]
//   tournamentId: string
//   roundId: string
// }) => {
//   if (!matches) return null

//   return matches.map(match => {
//     return {
//       externalId: String(match.id),
//       tournamentId,
//       roundId,
//       date: match.data_realizacao,
//       time: isNullable(match.hora_realizacao) ? '' : match.hora_realizacao,
//       homeScore: match?.placar_oficial_mandante,
//       awayScore: match.placar_oficial_visitante,
//       homeTeam: match.equipes.mandante?.sigla,
//       awayTeam: match.equipes.visitante?.sigla,
//       stadium: isNullable(match.sede?.nome_popular) ? null : match.sede?.nome_popular,
//       gameStarted: isNullable(match.jogo_ja_comecou) ? false : match.jogo_ja_comecou
//     }
//   })
// }

// TODO Use Lodash isNil
export const isNull = (value: any) => {
  return value === null || value === undefined
}

const GLOBO_ESPORTE_API =
  'https://api.globoesporte.globo.com/tabela/:external_id/fase/:mode-:slug/rodada/:round/jogos/'

export const Provider = {
  getURL: (tournament: SelectTournament, round: number) => {
    return GLOBO_ESPORTE_API.replace(':external_id', tournament.externalId)
      .replace(':mode', tournament.mode)
      .replace(':slug', tournament.slug)
      .replace(':round', String(round))
  },
  mapRoundFromAPI: ({
    roundData,
    roundId,
    tournamentId
  }: {
    tournamentId: string
    roundId: number
    roundData: GloboEsporteApiMatch[]
  }) => {
    const result = roundData.map(match => {
      return {
        externalId: String(match.id),
        roundId: String(roundId),
        tournamentId,
        homeTeamId: String(match.equipes.mandante.id),
        homeScore: String(match.placar_oficial_mandante ?? ''),
        awayTeamId: String(match.equipes.visitante.id),
        awayScore: String(match.placar_oficial_visitante ?? ''),
        date: isNull(match.data_realizacao) ? null : new Date(match.data_realizacao),
        time: match.data_realizacao ?? null,
        status: match.jogo_ja_comecou ? 'started' : 'not-started'
      } satisfies typeof InsertMatch
    })

    return result
  },
  createMatchOnDatabase: async (parsedMatch: IParsedMatchFromAPI) => {
    const dataToInsert = {
      externalId: String(parsedMatch.externalId),
      roundId: String(parsedMatch.roundId),
      tournamentId: parsedMatch.tournamentId,
      homeTeamId: String(parsedMatch.teams.home.id),
      homeScore: String(parsedMatch.teams.home.score ?? ''),
      awayTeamId: String(parsedMatch.teams.away.id),
      awayScore: String(parsedMatch.teams.away.score ?? ''),
      date: parsedMatch.date ? new Date(parsedMatch.date) : null,
      time: parsedMatch.time ?? null,
      stadium: parsedMatch.stadium ?? null,
      status: parsedMatch.status
    } satisfies typeof InsertMatch

    return await db.insert(TMatch).values(dataToInsert)
  },
  mapData: (dataFromAPI: {
    tournamentId: string
    roundId: number
    rawData: GloboEsporteApiMatch[]
  }) => {
    return dataFromAPI.rawData.map(match => {
      return {
        externalId: String(match.id),
        roundId: String(dataFromAPI.roundId),
        tournamentId: dataFromAPI.tournamentId,
        date: isNull(match.data_realizacao) ? null : new Date(match.data_realizacao),
        time: match.hora_realizacao ?? null,
        status: match.jogo_ja_comecou ? 'started' : 'not-started',
        stadium: isNull(match.sede?.nome_popular) ? null : match.sede?.nome_popular,
        teams: {
          home: {
            score: match.placar_oficial_mandante,
            id: match.equipes.mandante.id,
            name: match.equipes.mandante.nome_popular,
            shortName: match.equipes.mandante.sigla
          },
          away: {
            score: match.placar_oficial_visitante,
            id: match.equipes.visitante.id,
            name: match.equipes.visitante.nome_popular,
            shortName: match.equipes.visitante.sigla
          }
        }
      } satisfies IParsedMatchFromAPI
    })
  }
}

export type IParsedMatchFromAPI = {
  externalId: string
  roundId: string
  tournamentId: string
  date: Date | null
  time: string | null
  status: string
  teams: {
    home: {
      id: number
      name: string
      shortName: string
      score: number | null
    }
    away: {
      id: number
      name: string
      shortName: string
      score: number | null
    }
  }
  stadium: string | null
}

// upsertTeamOnDatabase: async (team: typeof InsertTeam) => {
//   const parsedTeam = Provider.mapTeamFromAPI(team)

//   return await db
//     .insert(TTeam)
//     .values(parsedTeam)
//     .onConflictDoUpdate({
//       target: TTeam.externalId,
//       set: {
//         name: parsedTeam.name,
//         shortName: parsedTeam.shortName,
//         externalId: String(parsedTeam.externalId)
//       }
//     })
// },

const BRASILEIRAO_24 = {
  externalId: 'd1a37fa4-e948-43a6-ba53-ab24ab3a45b1',
  rounds: 38,
  provider: 'globo-esporte',
  season: '24',
  mode: 'fase-unica',
  slug: 'campeonato-brasileiro-2024',
  label: 'brasileirão 24'
}

const PREMIER_LEAGUE_24_25 = {
  tournamentId: 'c33769be-62ec-43c6-a633-8c826e14a696',
  rounds: 38,
  provider: 'globo-esporte',
  season: '24/25',
  mode: 'fase-unica',
  slug: 'campeonato-ingles-2024-2025',
  label: 'Premier League 24/25'
}

// https://api.globoesporte.globo.com/tabela/d1a37fa4-e948-43a6-ba53-ab24ab3a45b1/fase/fase-unica-campeonato-brasileiro-2024/rodada/36/jogos/

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
