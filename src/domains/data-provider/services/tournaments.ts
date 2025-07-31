import { eq, and } from 'drizzle-orm';

import {
  T_Tournament,
  DB_InsertTournament,
  DB_UpdateTournament,
} from '@/domains/tournament/schema';
import db from '@/services/database';
import { CreateTournamentInput } from '../api/v2/tournament/typing';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { BaseScraper } from '../providers/playwright/base-scraper';
import Profiling from '@/services/profiling';

export class TournamentDataProviderService {
  private scraper: BaseScraper;

  constructor(scraper: BaseScraper) {
    this.scraper = scraper;
  }

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
    const logoUrl = this.getTournamentLogoUrl(payload.tournamentPublicId);
    const s3Key = await this.scraper.uploadAsset({
      logoUrl,
      filename: `tournament-${payload.tournamentPublicId}`,
    });
    const logo = this.scraper.getCloudFrontUrl(s3Key);

    Profiling.log({
      msg: `Created tournament logo: ${logo}....`,
      data: { logo },
      source: 'DATA_PROVIDER_V2_TOURNAMENT_init',
    });

    if (!payload.tournamentPublicId)
      throw new Error(
        `[TournamentDataProviderService] - [ERROR] - [INIT] - [TOURNAMENT PUBLIC ID IS NULL]`
      );

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

    return tournament;
  }
}
