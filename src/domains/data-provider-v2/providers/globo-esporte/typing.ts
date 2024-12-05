export const GLOBO_ESPORTE_MATCHES_URL =
  'https://api.globoesporte.globo.com/tabela/:external_id/fase/:mode-:slug/rodada/:round/jogos/';

export const GLOBO_ESPORTE_TOURNAMENT_API =
  'https://api.globoesporte.globo.com/tabela/:external_id/classificacao/';

export const GLOBO_ESPORT_TOURNAMENT_STANDINGS_API =
  'https://api.globoesporte.globo.com/tabela/:external_id/classificacao/';

export type API_GloboEsporteRound = API_GloboEsporteMatch[];
export type API_GloboEsporteMatch = {
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
  transmissao: {
    broadcast: {
      id: 'ENCERRADA';
      label: string;
    };
  } | null;
  jogo_ja_comecou: boolean | null;
};

export type API_GloboEsporteTeam = {
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
};

export type API_GloboEsporteStandings = {
  classificacao: API_GloboEsporteTeam[];
};

const PREMIER_LEAGUE_24_25 = {
  tournamentId: 'c33769be-62ec-43c6-a633-8c826e14a696',
  rounds: 38,
  provider: 'globo-esporte',
  season: '24/25',
  mode: 'fase-unica',
  slug: 'campeonato-ingles-2024-2025',
  label: 'Premier League 24/25',
};
