import { IApiProvider } from '@/domains/data-providers/typing';
import { matchProvider } from './match';
import { roundsProvider } from './rounds';
import { teamProvider } from './team';
import { tournamentProvider } from './tournament';

export const ProviderGloboEsporte: IApiProvider = {
  tournament: tournamentProvider,
  rounds: roundsProvider,
  match: matchProvider,
  team: teamProvider,
};
// convertTeamToSQL: (
//   team: IParsedMatchFromAPI['teams']['away'] | IParsedMatchFromAPI['teams']['home']
// ) => {
//   return {
//     name: team.name,
//     externalId: String(team.externalId),
//     shortName: team.shortName,
//     badge: team.badge ?? null,
//   } satisfies InsertTeam;
// },
// createTeamOnDatabase: async (
//   team: IParsedMatchFromAPI['teams']['away'] | IParsedMatchFromAPI['teams']['home']
// ) => {
//   const dataToInsert = Provider.convertTeamToSQL(team);

//   return await db.insert(TTeam).values(dataToInsert);
// },
// upsertTeamOnDatabase: async (
//   team: IParsedMatchFromAPI['teams']['away'] | IParsedMatchFromAPI['teams']['home']
// ) => {
//   const update = Provider.convertTeamToSQL(team);

//   return db
//     .insert(TTeam)
//     .values(update)
//     .onConflictDoUpdate({
//       target: TTeam.externalId,
//       set: {
//         name: update.name,
//         shortName: update.shortName,
//         externalId: String(update.externalId),
//         badge: update.badge ?? null,
//       },
//     });
// },
// createGuessOnDatabase: async (guess: GuessInput) => {
//   const contentToInsert = {
//     matchId: guess.matchId,
//     memberId: guess.memberId,
//     tournamentId: guess.tournamentId,
//     homeScore: guess.home.score,
//     awayScore: guess.away.score,
//   } satisfies InsertGuess;

//   return await db
//     .insert(TGuess)
//     .values(contentToInsert)
//     .onConflictDoUpdate({
//       target: [TGuess.memberId, TGuess.matchId],
//       set: {
//         awayScore: sql`excluded.away_score`,
//         homeScore: sql`excluded.home_score`,
//       },
//     })
//     .returning();
// },

export type GloboEsporteMatch = {
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

const PREMIER_LEAGUE_24_25 = {
  tournamentId: 'c33769be-62ec-43c6-a633-8c826e14a696',
  rounds: 38,
  provider: 'globo-esporte',
  season: '24/25',
  mode: 'fase-unica',
  slug: 'campeonato-ingles-2024-2025',
  label: 'Premier League 24/25',
};
