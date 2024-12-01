import { T_Match } from '@/domains/match/schema';
import db from '@/services/database';
import { safeDate, safeString } from '@/utils';
import { eq } from 'drizzle-orm';
import { IApiProvider } from '../typing';
import { API_GloboEsporteMatch } from './typing/api';

export const matchProvider: IApiProvider['match'] = {
  parseToDB: data => {
    const match = data.match as API_GloboEsporteMatch;
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
      status: match.transmissao?.broadcast?.id === 'ENCERRADA' ? 'ended' : 'open',
    };
  },
  insertOnDB: async matches => {
    return db.insert(T_Match).values(matches);
  },
  updateOnDB: async matches => {
    return await db.transaction(async tx => {
      for (const match of matches) {
        await tx
          .update(T_Match)
          .set(match)
          .where(eq(T_Match.externalId, match.externalId));
      }
    });
  },
};
