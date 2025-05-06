import { eq, and } from 'drizzle-orm';

import {
  T_Tournament,
  DB_InsertTournament,
  DB_UpdateTournament,
} from '@/domains/tournament/schema';
import db from '@/services/database';
import { fetchAndStoreAssetFromApi } from '@/utils';
import { CreateTournamentInput } from '../api/v2/tournament/typing';

export class TournamentService {
  public async getTournamentLogo(baseUrl: string, tournamentPublicId: string) {
    try {
      const logo = `https://sofascore.com/images/tournament/${tournamentPublicId}.png`;
      return logo;
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [GET TOURNAMENT]', error);
      throw error;
    }
  }

  public async createOnDatabase(data: DB_InsertTournament) {
    try {
      const [tournament] = await db.insert(T_Tournament).values(data).returning();
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

  public async fetchAndStoreLogo(data: any) {
    try {
      const assetPath = await fetchAndStoreAssetFromApi(data);

      return `https://${process.env['AWS_CLOUDFRONT_URL']}/${assetPath}`;
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [FETCH AND STORE LOGO]', error);
      throw error;
    }
  }

  public async init(payload: CreateTournamentInput) {
    const logo = await this.getTournamentLogo(payload.baseUrl, payload.tournamentPublicId);
    const tournament = await this.createOnDatabase({
        externalId: payload.tournamentPublicId,
        baseUrl: payload.baseUrl,
        provider: 'sofascore',
        season: payload.season,
        mode: payload.mode,
        label: payload.label,
        logo: "logo",
        standingsMode: payload.standingsMode,
        slug: payload.slug,
    })
    console.log('TOURNAMENT CREATION - [TOURNAMENT CREATED]', tournament);

    return tournament;
  }
}
