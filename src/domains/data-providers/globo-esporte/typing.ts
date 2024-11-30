export type GloboEsporteApiRound = GloboEsporteApiMatch[];

export const GLOBO_ESPORTE_MATCHES_API =
  'https://api.globoesporte.globo.com/tabela/:external_id/fase/:mode-:slug/rodada/:round/jogos/';

export const GLOBO_ESPORTE_TOURNAMENT_API =
  'https://api.globoesporte.globo.com/tabela/:external_id/classificacao/';

export const GLOBO_ESPORT_TOURNAMENT_STANDINGS_API =
  'https://api.globoesporte.globo.com/tabela/:external_id/classificacao/';

export type GloboEsporteApiMatch = {
  id: number;
  data_realizacao: string | null;
  hora_realizacao: string | null;
  placar_oficial_visitante: number | null;
  placar_oficial_mandante: number | null;
  placar_penaltis_visitante: number | null;
  placar_penaltis_mandante: number | null;
  equipes: {
    mandante: {
      id: number;
      nome_popular: string;
      sigla: string;
      escudo: string;
    };
    visitante: {
      id: number;
      nome_popular: string;
      sigla: string;
      escudo: string;
    };
  };
  sede: {
    nome_popular: string;
  };
  transmissao: boolean | null;
  jogo_ja_comecou: boolean | null;
};

export type GloboEsporteStandings = {
  classificacao: {
    ordem: number;
    variacao: number;
    pontos: number;
    nome_popular: string;
    sigla: string;
    vitorias: number;
    escudo: string;
    equipe_id: number;
    aproveitamento: number;
    jogos: number;
    derrotas: number;
    faixa_classificacao_cor: string;
    faixa_classificacao: {
      cor: string;
    };
    ultimos_jogos: string[];
    saldo_gols: number;
    gols_pro: number;
    gols_contra: number;
    empates: number;
  }[];
};
