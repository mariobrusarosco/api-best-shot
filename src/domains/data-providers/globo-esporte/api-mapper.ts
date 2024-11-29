import {
  GLOBO_ESPORTE_MATCHES_API,
  GLOBO_ESPORTE_TOURNAMENT_API,
} from '@/domains/data-providers/globo-esporte/metadata';
import { IApiProvider } from '@/domains/data-providers/typing';
import { TTournament } from '@/domains/tournament/schema';
import db from '@/services/database';

// TODO Use Lodash isNil
export const isNull = (value: any) => {
  return value === null || value === undefined;
};

export const ProviderGloboEsporte: IApiProvider = {
  getURL: data =>
    GLOBO_ESPORTE_MATCHES_API.replace(':external_id', data.externalId)
      .replace(':mode', data.mode)
      .replace(':slug', data.slug)
      .replace(':round', String(data.round)),
  tournament: {
    prepareUrl: ({ externalId }) =>
      GLOBO_ESPORTE_TOURNAMENT_API.replace(':external_id', externalId),
    createOnDB: async data => {
      return db.insert(TTournament).values(data).returning();
    },
  },
  // matches: {
  //   prepareUrl: ({ externalId, mode, round, slug }) => {
  //     return GLOBO_ESPORTE_MATCHES_API.replace(':external_id', externalId)
  //       .replace(':mode', mode)
  //       .replace(':slug', slug)
  //       .replace(':round', String(round));
  //   },
};
// match: {
// parse: (round) => {
//   return round.rawData.map(match => {
//     return {

// externalId: String(match.id),
// roundId: String(round.roundId),
// tournamentId: round.tournamentId,
// date: isNull(match.data_realizacao) ? null : new Date(match.data_realizacao),
// time: match.hora_realizacao ?? null,
// status: match.jogo_ja_comecou ? 'started' : 'not-started',
// stadium: isNull(match.sede?.nome_popular) ? null : match.sede?.nome_popular,
// teams: {
//   home: {
//     score: match.placar_oficial_mandante,
//     externalId: match.equipes.mandante.id,
//     name: match.equipes.mandante.nome_popular,
//     shortName: match.equipes.mandante.sigla,
//     badge: match.equipes.mandante.escudo,
//   },
//   away: {
//     score: match.placar_oficial_visitante,
//     externalId: match.equipes.visitante.id,
//     name: match.equipes.visitante.nome_popular,
//     shortName: match.equipes.visitante.sigla,
//     badge: match.equipes.visitante.escudo,
//   },
// },
//   } satisfies InsertMatch;
// });
// },
// },
// createTournamentOnDatabase: (tournament: InsertTournament) => {
//   return db.insert(TTournament).values(tournament).returning();
// },
// convertMatchToSQL: (parsedMatch: IParsedMatchFromAPI) => {
//   return {
//     externalId: String(parsedMatch.externalId),
//     roundId: String(parsedMatch.roundId),
//     tournamentId: parsedMatch.tournamentId,
//     homeTeamId: String(parsedMatch.teams.home.externalId),
//     homeScore:
//       parsedMatch.teams.home.score === null
//         ? null
//         : String(parsedMatch.teams.home.score),
//     awayTeamId: String(parsedMatch.teams.away.externalId),
//     awayScore:
//       parsedMatch.teams.away.score === null
//         ? null
//         : String(parsedMatch.teams.away.score),
//     date: parsedMatch.date ? new Date(parsedMatch.date) : null,
//     time: parsedMatch.time ?? null,
//     stadium: parsedMatch.stadium ?? null,
//     status: parsedMatch.status,
//   } satisfies InsertMatch;
// },
// createMatchOnDatabase: async (parsedMatch: IParsedMatchFromAPI) => {
//   const dataToInsert = Provider.convertMatchToSQL(parsedMatch);

//   return db.insert(TMatch).values(dataToInsert).returning();
// },
// updateMatchOnDatabase: async (parsedMatch: IParsedMatchFromAPI) => {
//   const dataToUpdate = Provider.convertMatchToSQL(parsedMatch);

//   return await db
//     .update(TMatch)
//     .set(dataToUpdate)
//     .where(and(eq(TMatch.externalId, String(dataToUpdate.externalId))))
//     .returning();
// },
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

export type IParsedMatchFromAPI = {
  externalId: string;
  roundId: string;
  tournamentId: string;
  date: Date | null;
  time: string | null;
  status: string;
  teams: {
    home: {
      externalId: number;
      name: string;
      shortName: string;
      score: number | null;
      badge: string | null;
    };
    away: {
      externalId: number;
      name: string;
      shortName: string;
      score: number | null;
      badge: string | null;
    };
  };
  stadium: string | null;
};

const BRASILEIRAO_24 = {
  externalId: 'd1a37fa4-e948-43a6-ba53-ab24ab3a45b1',
  rounds: 38,
  provider: 'globo-esporte',
  season: '24',
  mode: 'fase-unica',
  slug: 'campeonato-brasileiro-2024',
  label: 'brasileirão 24',
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

export type IMatch = {
  externalId: number;
  roundId: number;
  tournamentId: string;
  home: {
    id: number;
    name: string;
    shortName: string;
    nameCode: string;
    score: number | null;
    externalId: number;
  };
  away: {
    id: number;
    name: string;
    shortName: string;
    nameCode: string;
    score: number | null;
    externalId: number;
  };
  date: Date | null;
  status?: string;
};
