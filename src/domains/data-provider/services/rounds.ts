import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import type { ENDPOINT_ROUNDS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import db from '@/services/database';
import {
  DB_InsertTournamentRound,
  DB_UpdateTournamentRound,
} from '@/domains/tournament-round/schema';
import { T_TournamentRound } from '@/domains/tournament-round/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import Profiling from '@/services/profiling';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface RoundScrapingOperation {
  step: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  data?: any;
  timestamp: string;
}

interface RoundScrapingInvoice {
  requestId: string;
  tournament: {
    id: string;
    baseUrl: string;
  };
  operationType: 'create' | 'update';
  startTime: string;
  endTime?: string;
  operations: RoundScrapingOperation[];
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
  };
}

export class RoundDataProviderService {
  private scraper: BaseScraper;
  private invoice: RoundScrapingInvoice;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.invoice = {
      requestId,
      tournament: {
        id: '',
        baseUrl: '',
      },
      operationType: 'create',
      startTime: new Date().toISOString(),
      operations: [],
      summary: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
      },
    };
  }

  private addOperation(step: string, operation: string, status: 'started' | 'completed' | 'failed', data?: any) {
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
    const filename = `rounds-scraping-${this.invoice.requestId}.json`;
    const filepath = join(process.cwd(), 'tournament-scraping-reports', filename);
    
    try {
      writeFileSync(filepath, JSON.stringify(this.invoice, null, 2));
      Profiling.log({
        msg: `[INVOICE] Tournament rounds scraping report generated successfully`,
        data: { filepath, requestId: this.invoice.requestId },
        source: 'DATA_PROVIDER_V2_ROUNDS_generateInvoiceFile',
      });
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_ROUNDS_generateInvoiceFile',
        error,
        data: { filepath, requestId: this.invoice.requestId }
      });
      console.error('Failed to write rounds invoice file:', error);
    }
  }

  public async getTournamentRounds(baseUrl: string) {
    this.addOperation('scraping', 'fetch_rounds', 'started', { baseUrl });
    
    try {
      const url = `${baseUrl}/rounds`;

      await this.scraper.goto(url);
      const content = await this.scraper.getPageContent();

      this.addOperation('scraping', 'fetch_rounds', 'completed', { url, roundsCount: content.rounds?.length || 0 });
      return content as ENDPOINT_ROUNDS;
    } catch (error) {
      this.addOperation('scraping', 'fetch_rounds', 'failed', { error: error.message });
      console.error('[SOFASCORE] - [ERROR] - [GET TOURNAMENT ROUNDS]', error);
      throw error;
    }
  }

  public enhanceRounds(
    baseUrl: string,
    tournamentId: string,
    roundsResponse: ENDPOINT_ROUNDS
  ): DB_InsertTournamentRound[] {
    this.addOperation('transformation', 'enhance_rounds', 'started', { 
      baseUrl, 
      tournamentId, 
      rawRoundsCount: roundsResponse.rounds.length 
    });

    try {
      const enhancedRounds = roundsResponse.rounds.map((round, index) => {
        const isSpecialRound = !!round?.prefix;
        const isKnockoutRound = !isSpecialRound && !!round?.name;
        const isRegularRound = !isSpecialRound && !isKnockoutRound;

        const order = index + 1;
        let endpoint = `${baseUrl}/events/round/${round.round}`;
        let slug = '';
        let label = '';

        if (isKnockoutRound) {
          endpoint += `/slug/${round.slug}`;
          slug += `${round.slug}`;
          label = round.name || order.toString();
        } else if (isSpecialRound) {
          endpoint += `/slug/${round.slug}/prefix/${round.prefix}`;
          slug += `${round.prefix}-${round.slug}`;
          label = round.prefix!;
        } else if (isRegularRound) {
          slug += round.round;
          label = round.round.toString();
        }

        return {
          providerUrl: endpoint,
          providerId: String(round.round),
          tournamentId: tournamentId,
          order: order.toString(),
          label: label,
          slug: slug.toLowerCase(),
          knockoutId: round.prefix,
          type: isKnockoutRound || isSpecialRound ? 'knockout' : 'season',
          name: round.name,
        } as DB_InsertTournamentRound;
      });

      this.addOperation('transformation', 'enhance_rounds', 'completed', { 
        enhancedRoundsCount: enhancedRounds.length,
        roundTypes: {
          regular: enhancedRounds.filter(r => r.type === 'season').length,
          knockout: enhancedRounds.filter(r => r.type === 'knockout').length
        }
      });

      return enhancedRounds;
    } catch (error) {
      this.addOperation('transformation', 'enhance_rounds', 'failed', { error: error.message });
      console.error('[SOFASCORE] - [ERROR] - [ENHANCE TOURNAMENT ROUNDS]', error);
      throw error;
    }
  }

  public async createOnDatabase(roundsToInsert: DB_InsertTournamentRound[]) {
    this.addOperation('database', 'create_rounds', 'started', { 
      roundsCount: roundsToInsert.length,
      tournamentId: roundsToInsert[0]?.tournamentId 
    });

    try {
      const rounds = await db
        .insert(T_TournamentRound)
        .values(roundsToInsert)
        .returning();
      
      this.addOperation('database', 'create_rounds', 'completed', { 
        createdRoundsCount: rounds.length,
        roundIds: rounds.map(r => r.id)
      });

      return rounds;
    } catch (error) {
      this.addOperation('database', 'create_rounds', 'failed', { error: error.message });
      console.error(
        '[SOFASCORE] - [ERROR] - [CREATE TOURNAMENT ROUNDS ON DATABASE]',
        error
      );
      throw error;
    }
  }


  public async init(tournamentId: string, tournamentBaseUrl: string) {
    // Initialize invoice tournament data
    this.invoice.tournament = {
      id: tournamentId,
      baseUrl: tournamentBaseUrl,
    };
    this.invoice.operationType = 'create';

    this.addOperation('initialization', 'validate_input', 'started', { tournamentId, tournamentBaseUrl });

    try {
      this.addOperation('initialization', 'validate_input', 'completed', { tournamentId });

      const rawRounds = await this.getTournamentRounds(tournamentBaseUrl);
      const enhancedRounds = this.enhanceRounds(tournamentBaseUrl, tournamentId, rawRounds);
      const query = await this.createOnDatabase(enhancedRounds);

      // Generate invoice file at the very end
      this.generateInvoiceFile();

      return query;
    } catch (error) {
      this.addOperation('initialization', 'process_rounds', 'failed', { error: error.message });
      this.generateInvoiceFile();
      throw error;
    }
  }

  public async updateOnDatabase(roundsToUpdate: DB_UpdateTournamentRound[]) {
    this.addOperation('database', 'update_rounds', 'started', { 
      roundsCount: roundsToUpdate.length,
      tournamentId: roundsToUpdate[0]?.tournamentId 
    });

    if (roundsToUpdate.length === 0) {
      this.addOperation('database', 'update_rounds', 'failed', { error: 'No rounds to update' });
      Profiling.error({
        error: new Error('No rounds to update in the database'),
        source: 'RoundDataProviderService.updateOnDatabase',
      });
      return [];
    }

    try {
      const query = await QUERIES_TOURNAMENT_ROUND.upsertTournamentRounds(roundsToUpdate);
      
      this.addOperation('database', 'update_rounds', 'completed', { 
        updatedRoundsCount: query.length
      });

      return query;
    } catch (error) {
      this.addOperation('database', 'update_rounds', 'failed', { error: error.message });
      Profiling.error({
        error,
        source: 'RoundDataProviderService.updateOnDatabase',
      });
      throw error;
    }
  }

  public async updateTournament(tournamentId: string, tournamentBaseUrl: string) {
    // Initialize invoice tournament data
    this.invoice.tournament = {
      id: tournamentId,
      baseUrl: tournamentBaseUrl,
    };
    this.invoice.operationType = 'update';

    this.addOperation('initialization', 'validate_input', 'started', { tournamentId, tournamentBaseUrl });

    try {
      this.addOperation('initialization', 'validate_input', 'completed', { tournamentId });

      Profiling.log({
        msg: `[RoundDataProviderService] - Updating rounds for tournament: ${tournamentId}`,
      });

      const rawRounds = await this.getTournamentRounds(tournamentBaseUrl);
      const enhancedRounds = this.enhanceRounds(tournamentBaseUrl, tournamentId, rawRounds);
      const query = await this.updateOnDatabase(enhancedRounds);

      Profiling.log({
        msg: `[RoundDataProviderService] - Updated rounds for tournament: ${tournamentId}`,
        data: { rounds: enhancedRounds },
      });

      // Generate invoice file at the very end
      this.generateInvoiceFile();

      return query;
    } catch (error) {
      this.addOperation('update', 'process_rounds', 'failed', { error: error.message });
      this.generateInvoiceFile();
      Profiling.error({
        source: 'RoundDataProviderService.updateTournament',
        error,
      });
      throw error;
    }
  }
}
