import { eq, and } from 'drizzle-orm';

import {
  T_Tournament,
  DB_InsertTournament,
  DB_UpdateTournament,
} from '@/domains/tournament/schema';
import db from '@/services/database';
import { CreateTournamentInput } from '../api/v2/tournament/typing';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';

export class TournamentDataProviderService {
  public async createOnDatabase(input: DB_InsertTournament) {
    try {
      const tournament = await SERVICES_TOURNAMENT.createTournament(input);

      return tournament;
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [CREATE TOURNAMENT]', error);
      throw error;
    }
  }

  public async updateOnDatabase(data: DB_UpdateTournament) {
    try {
      const [tournament] = await db
        .update(T_Tournament)
        .set(data)
        .where(
          and(
            eq(T_Tournament.externalId, data.externalId),
            eq(T_Tournament.provider, data.provider)
          )
        )
        .returning();

      return tournament;
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [UPDATE TOURNAMENT]', error);
      throw error;
    }
  }

  public getTournamentLogoUrl(tournamentId: string | number): string {
    return `https://api.sofascore.app/api/v1/unique-tournament/${tournamentId}/image/dark`;
  }

  public async init(payload: CreateTournamentInput) {
    const logo = this.getTournamentLogoUrl(payload.tournamentPublicId);
    const tournament = await this.createOnDatabase({
      externalId: payload.tournamentPublicId,
      baseUrl: payload.baseUrl,
      provider: 'sofascore',
      season: payload.season,
      mode: payload.mode,
      label: payload.label,
      logo,
      standingsMode: payload.standingsMode,
      slug: payload.slug,
    });
    console.log('TOURNAMENT CREATION - [TOURNAMENT CREATED]', tournament);

    return tournament;
  }
}
