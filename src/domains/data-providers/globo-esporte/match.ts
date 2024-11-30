import { TMatch } from '@/domains/match/schema';
import db from '@/services/database';
import { safeDate, safeString } from '@/utils';
import { eq } from 'drizzle-orm';
import { IApiProvider } from '../typing';
import { GloboEsporteApiMatch } from './typing';

export const matchProvider: IApiProvider['match'] = {
  parse: data => {
    const match = data.match as GloboEsporteApiMatch;
    const tournamentId = data.tournamentId;
    const tournamentExternalId = String(data.tournamentExternalId);
    const roundId = String(data.roundId);

    return {
      externalId: String(match.id),
      provider: 'ge',
      tournamentId,
      tournamentExternalId,
      roundId,
      homeTeamId: String(match.equipes.mandante.id),
      homeScore: safeString(match.placar_oficial_mandante),
      awayTeamId: String(match.equipes.visitante.id),
      awayScore: safeString(match.placar_oficial_visitante),
      date: safeDate(match.data_realizacao),
      time: safeString(match.hora_realizacao),
      stadium: safeString(match?.sede?.nome_popular),
      status: match.jogo_ja_comecou ? 'started' : 'not-started',
    };
  },
  insertMatchesOnDB: async matches => {
    return db.insert(TMatch).values(matches);
  },
  updateMatchesOnDB: async matches => {
    return await db.transaction(async tx => {
      for (const match of matches) {
        await tx.update(TMatch).set(match).where(eq(TMatch.externalId, match.externalId));
      }
    });
  },
};
