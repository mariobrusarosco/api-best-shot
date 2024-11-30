export type GloboEsporteApiRound = GloboEsporteApiMatch[];

// Deprecated
export type GloboEsporteApiMatch = {
  id: number;
  data_realizacao: string;
  hora_realizacao: string;
  placar_oficial_visitante: number | null;
  placar_oficial_mandante: number | null;
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
  jogo_ja_comecou: boolean;
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
