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
