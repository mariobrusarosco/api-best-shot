export type RawSerieARound = {
  id: number
  content: RawSerieAGame[]
}

export type RawSerieAGame = {
  id: number
  data_realizacao: string
  hora_realizacao: string
  placar_oficial_visitante: number | null
  placar_oficial_mandante: number | null
  equipes: {
    mandante: {
      id: number
      nome_popular: string
      sigla: string
    }
    visitante: {
      id: number
      nome_popular: string
      sigla: string
    }
  }
  sede: {
    nome_popular: string
  }
  jogo_ja_comecou: boolean
}

export type SerieAGame = {
  id: number
  date: string
  time: string
  homeScore: number | null
  awayScore: number | null
  homeTeam: string
  awayTeam: string
  stadium: string
}

export type SerieARound = {
  id: number
  games: SerieAGame[]
}
