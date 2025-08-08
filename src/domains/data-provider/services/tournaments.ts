import { eq, and } from 'drizzle-orm';
import { writeFileSync } from 'fs';
import { join } from 'path';

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

interface ScrapingOperation {
  step: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  data?: any;
  timestamp: string;
}

interface TournamentScrapingInvoice {
  requestId: string;
  tournament: {
    label: string;
    tournamentId: string;
    provider: string;
  };
  startTime: string;
  endTime?: string;
  operations: ScrapingOperation[];
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
  };
}

export class TournamentDataProviderService {
  private scraper: BaseScraper;
  private invoice: TournamentScrapingInvoice;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.invoice = {
      requestId,
      tournament: {
        label: '',
        tournamentId: '',
        provider: '',
      },
      startTime: new Date().toISOString(),
      operations: [],
      summary: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
      },
    };
  }

  private addOperation(
    step: string,
    operation: string,
    status: 'started' | 'completed' | 'failed',
    data?: any
  ) {
    this.invoice.operations.push({
      step,
      operation,
      status,
      data,
      timestamp: new Date().toISOString(),
    });

    this.invoice.summary.totalOperations++;
    if (status === 'completed') {
      this.invoice.summary.successfulOperations++;
    } else if (status === 'failed') {
      this.invoice.summary.failedOperations++;
    }
  }

  private generateInvoiceFile() {
    this.invoice.endTime = new Date().toISOString();
    const filename = `tournament-scraping-${this.invoice.requestId}.json`;
    const filepath = join(process.cwd(), 'tournament-scraping-reports', filename);

    try {
      writeFileSync(filepath, JSON.stringify(this.invoice, null, 2));
      Profiling.log({
        msg: `[INVOICE] Tournament scraping report generated successfully`,
        data: { filepath, requestId: this.invoice.requestId },
        source: 'DATA_PROVIDER_V2_TOURNAMENT_generateInvoiceFile',
      });
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_TOURNAMENT_generateInvoiceFile',
        error,
        data: { filepath, requestId: this.invoice.requestId },
      });
      console.error('Failed to write invoice file:', error);
    }
  }

  public async createOnDatabase(input: DB_InsertTournament) {
    this.addOperation('database', 'create_tournament', 'started', {
      externalId: input.externalId,
      label: input.label,
    });

    try {
      const tournament = await SERVICES_TOURNAMENT.createTournament(input);

      this.addOperation('database', 'create_tournament', 'completed', {
        tournamentId: tournament.id,
        label: tournament.label,
      });
      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('database', 'create_tournament', 'failed', {
        error: errorMessage,
      });
      console.error('[SOFASCORE] - [ERROR] - [CREATE TOURNAMENT]', error);
      throw error;
    }
  }

  public async updateOnDatabase(data: DB_UpdateTournament) {
    this.addOperation('database', 'update_tournament', 'started', {
      externalId: data.externalId,
      provider: data.provider,
    });

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

      this.addOperation('database', 'update_tournament', 'completed', {
        tournamentId: tournament.id,
        label: tournament.label,
      });
      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('database', 'update_tournament', 'failed', {
        error: errorMessage,
      });
      console.error('[SOFASCORE] - [ERROR] - [UPDATE TOURNAMENT]', error);
      throw error;
    }
  }

  public getTournamentLogoUrl(tournamentId: string | number): string {
    return `https://api.sofascore.app/api/v1/unique-tournament/${tournamentId}/image/dark`;
  }

  public async init(payload: CreateTournamentInput) {
    // Initialize invoice tournament data
    this.invoice.tournament = {
      label: payload.label,
      tournamentId: payload.tournamentPublicId,
      provider: payload.provider,
    };

    this.addOperation('initialization', 'validate_input', 'started', {
      tournamentId: payload.tournamentPublicId,
    });

    if (!payload.tournamentPublicId) {
      this.addOperation('initialization', 'validate_input', 'failed', {
        error: 'Tournament public ID is null',
      });
      throw new Error(
        `[TournamentDataProviderService] - [ERROR] - [INIT] - [TOURNAMENT PUBLIC ID IS NULL]`
      );
    }

    this.addOperation('initialization', 'validate_input', 'completed', {
      tournamentId: payload.tournamentPublicId,
    });

    this.addOperation('scraping', 'fetch_logo', 'started', {
      tournamentId: payload.tournamentPublicId,
    });

    try {
      const logoUrl = this.getTournamentLogoUrl(payload.tournamentPublicId);
      const s3Key = await this.scraper.uploadAsset({
        logoUrl,
        filename: `tournament-${payload.tournamentPublicId}`,
      });
      const logo = this.scraper.getCloudFrontUrl(s3Key);

      this.addOperation('scraping', 'fetch_logo', 'completed', { logoUrl: logo, s3Key });

      Profiling.log({
        msg: `Created tournament logo: ${logo}....`,
        data: { logo },
        source: 'DATA_PROVIDER_V2_TOURNAMENT_init',
      });

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

      // Generate invoice file at the very end
      this.generateInvoiceFile();

      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.addOperation('scraping', 'fetch_logo', 'failed', { error: errorMessage });
      this.generateInvoiceFile();
      throw error;
    }
  }
}
