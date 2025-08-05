import { BaseScraper } from '../providers/playwright/base-scraper';
import { DB_InsertMatch, T_Match } from '@/domains/match/schema';
import { safeString } from '@/utils';
import db from '@/services/database';
import { ENDPOINT_ROUND } from '../providers/sofascore_v2/schemas/endpoints';
import Profiling from '@/services/profiling';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { DB_SelectTournamentRound } from '@/domains/tournament-round/schema';
import { QUERIES_MATCH } from '@/domains/match/queries';
import { writeFileSync } from 'fs';
import { join } from 'path';

const safeSofaDate = (date: any) => {
  return date === null || date === undefined ? null : new Date(date);
};

interface MatchesScrapingOperation {
  step: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  data?: any;
  timestamp: string;
}

interface MatchesScrapingInvoice {
  requestId: string;
  tournament: {
    id: string;
    label: string;
  };
  operationType: 'create' | 'update';
  startTime: string;
  endTime?: string;
  operations: MatchesScrapingOperation[];
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    matchCounts: {
      totalRoundsProcessed: number;
      totalMatchesScraped: number;
      totalMatchesCreated: number;
      roundsWithMatches: number;
      roundsWithoutMatches: number;
    };
  };
}

export class MatchesDataProviderService {
  private scraper: BaseScraper;
  private invoice: MatchesScrapingInvoice;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.invoice = {
      requestId,
      tournament: {
        id: '',
        label: '',
      },
      operationType: 'create',
      startTime: new Date().toISOString(),
      operations: [],
      summary: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        matchCounts: {
          totalRoundsProcessed: 0,
          totalMatchesScraped: 0,
          totalMatchesCreated: 0,
          roundsWithMatches: 0,
          roundsWithoutMatches: 0,
        },
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
    const filename = `matches-scraping-${this.invoice.requestId}.json`;
    const filepath = join(process.cwd(), 'tournament-scraping-reports', filename);
    
    try {
      writeFileSync(filepath, JSON.stringify(this.invoice, null, 2));
      Profiling.log({
        msg: `[INVOICE] Matches scraping report generated successfully`,
        data: { filepath, requestId: this.invoice.requestId },
        source: 'DATA_PROVIDER_V2_MATCHES_generateInvoiceFile',
      });
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_generateInvoiceFile',
        error: error as Error,
      });
      console.error('Failed to write matches invoice file:', error);
    }
  }

  public async getTournamentMatchesByRound(round: DB_SelectTournamentRound) {
    this.addOperation('scraping', 'fetch_round_matches', 'started', { 
      roundSlug: round.slug, 
      providerUrl: round.providerUrl 
    });

    try {
      await this.scraper.goto(round.providerUrl);
      const rawContent = (await this.scraper.getPageContent()) as ENDPOINT_ROUND;

      if (!rawContent?.events || rawContent?.events?.length === 0) {
        this.addOperation('scraping', 'fetch_round_matches', 'completed', { 
          roundSlug: round.slug, 
          matchesCount: 0,
          note: 'No matches found'
        });
        this.invoice.summary.matchCounts.roundsWithoutMatches++;
        return [];
      }

      const matches = this.mapMatches(rawContent, round.tournamentId, round.slug);

      this.addOperation('scraping', 'fetch_round_matches', 'completed', { 
        roundSlug: round.slug, 
        matchesCount: matches.length,
        rawEventsCount: rawContent.events.length
      });

      this.invoice.summary.matchCounts.roundsWithMatches++;
      this.invoice.summary.matchCounts.totalMatchesScraped += matches.length;

      return matches;
    } catch (error) {
      this.addOperation('scraping', 'fetch_round_matches', 'failed', { 
        roundSlug: round.slug, 
        error: (error as Error).message 
      });
      Profiling.error({
        source: 'DATA_PROVIDER_MATCHES_getTournamentMatchesByRound',
        error: error as Error,
      });
      throw error;
    }
  }

  public async getTournamentMatches(
    rounds: DB_SelectTournamentRound[],
    tournamentId: string
  ) {
    this.addOperation('scraping', 'fetch_tournament_matches', 'started', { 
      tournamentId, 
      roundsCount: rounds.length 
    });

    try {
      if (rounds.length === 0) {
        this.addOperation('scraping', 'fetch_tournament_matches', 'failed', { 
          error: 'No rounds provided' 
        });
        Profiling.error({
          source: 'MatchesDataProviderService.getTournamentMatches',
          error: new Error('No rounds provided, returning empty matches array'),
        });
        return [];
      }

      const roundsWithMatches: DB_InsertMatch[][] = [];

      for (const round of rounds) {
        this.addOperation('scraping', 'process_round', 'started', { 
          roundSlug: round.slug, 
          roundLabel: round.label,
          providerUrl: round.providerUrl
        });

        await this.scraper.goto(round.providerUrl);
        const rawContent = (await this.scraper.getPageContent()) as ENDPOINT_ROUND;

        if (!rawContent?.events || rawContent?.events?.length === 0) {
          this.addOperation('scraping', 'process_round', 'completed', { 
            roundSlug: round.slug, 
            matchesCount: 0,
            note: 'No matches found, skipping round'
          });
          this.invoice.summary.matchCounts.roundsWithoutMatches++;
          await this.scraper.sleep(2500);
          continue;
        }

        const matches = this.mapMatches(rawContent, tournamentId, round.slug);
        roundsWithMatches.push(matches);

        this.addOperation('scraping', 'process_round', 'completed', { 
          roundSlug: round.slug, 
          matchesCount: matches.length,
          rawEventsCount: rawContent.events.length
        });

        this.invoice.summary.matchCounts.roundsWithMatches++;
        this.invoice.summary.matchCounts.totalMatchesScraped += matches.length;

        await this.scraper.sleep(2500);
      }

      this.invoice.summary.matchCounts.totalRoundsProcessed = rounds.length;

      const allMatches = roundsWithMatches.flat();
      this.addOperation('scraping', 'fetch_tournament_matches', 'completed', { 
        totalMatches: allMatches.length,
        roundsProcessed: rounds.length,
        roundsWithMatches: this.invoice.summary.matchCounts.roundsWithMatches,
        roundsWithoutMatches: this.invoice.summary.matchCounts.roundsWithoutMatches
      });

      return allMatches;
    } catch (error) {
      this.addOperation('scraping', 'fetch_tournament_matches', 'failed', { 
        error: (error as Error).message 
      });
      Profiling.error({
        source: 'DATA_PROVIDER_MATCHES_getTournamentMatches',
        error: error as Error,
      });
      throw error;
    }
  }

  public mapMatches(rawContent: ENDPOINT_ROUND, tournamentId: string, roundSlug: string) {
    try {
      const matches = rawContent.events.map(event => {
        return {
          externalId: safeString(event.id),
          provider: 'sofa',
          tournamentId,
          roundSlug,
          homeTeamId: safeString(event.homeTeam.id),
          homeScore: safeString(event.homeScore.display, null),
          homePenaltiesScore: safeString(event.homeScore.penalties, null),
          awayTeamId: safeString(event.awayTeam.id),
          awayScore: safeString(event.awayScore.display, null),
          awayPenaltiesScore: safeString(event.awayScore.penalties, null),
          date: safeSofaDate(event.startTimestamp! * 1000),
          status: this.getMatchStatus(event),
        } as DB_InsertMatch;
      });

      return matches as DB_InsertMatch[];
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [MAP MATCHES]', error);
      throw error;
    }
  }

  public getMatchStatus(match: ENDPOINT_ROUND['events'][number]) {
    try {
      const matchWasPostponed = match.status.type === 'postponed';
      const matcheEnded = match.status.type === 'finished';

      if (matchWasPostponed) return 'not-defined';
      if (matcheEnded) return 'ended';
      return 'open';
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [GET MATCH STATUS]', error);
      throw error;
    }
  }

  async createOnDatabase(matches: DB_InsertMatch[]) {
    this.addOperation('database', 'create_matches', 'started', { matchesCount: matches.length });

    if (matches.length === 0) {
      this.addOperation('database', 'create_matches', 'failed', { error: 'No matches to create' });
      Profiling.error({
        error: new Error('No matches to create in the database'),
        source: 'MatchesDataProviderService.createOnDatabase',
      });
      return [];
    }

    try {
      const query = await db.insert(T_Match).values(matches);
      
      this.addOperation('database', 'create_matches', 'completed', { 
        createdMatchesCount: matches.length
      });

      this.invoice.summary.matchCounts.totalMatchesCreated = matches.length;

      return query;
    } catch (error) {
      this.addOperation('database', 'create_matches', 'failed', { error: (error as Error).message });
      Profiling.error({
        error,
        source: 'MatchesDataProviderService.createOnDatabase',
      });
      throw error;
    }
  }

  async updateOnDatabase(matches: DB_InsertMatch[]) {
    this.addOperation('database', 'update_matches', 'started', { matchesCount: matches.length });

    if (matches.length === 0) {
      this.addOperation('database', 'update_matches', 'failed', { error: 'No matches to update' });
      Profiling.error({
        error: new Error('No matches to update in the database'),
        source: 'MatchesDataProviderService.updateOnDatabase',
      });
      return 0;
    }

    try {
      const query = await QUERIES_MATCH.upsertMatches(matches);
      
      this.addOperation('database', 'update_matches', 'completed', { 
        updatedMatchesCount: query.length
      });

      return query.length;
    } catch (error) {
      this.addOperation('database', 'update_matches', 'failed', { error: (error as Error).message });
      Profiling.error({
        error,
        source: 'MatchesDataProviderService.updateOnDatabase',
      });
      throw error;
    }
  }

  public async init(
    rounds: DB_SelectTournamentRound[],
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    // Initialize invoice tournament data
    this.invoice.tournament = {
      id: tournament.id,
      label: tournament.label,
    };
    this.invoice.operationType = 'create';

    this.addOperation('initialization', 'validate_input', 'started', { 
      tournamentId: tournament.id, 
      tournamentLabel: tournament.label,
      roundsCount: rounds.length
    });

    try {
      this.addOperation('initialization', 'validate_input', 'completed', { tournamentId: tournament.id });

      const rawMatches = await this.getTournamentMatches(rounds, tournament.id);
      const query = await this.createOnDatabase(rawMatches);

      // Generate invoice file at the very end
      this.generateInvoiceFile();

      return query;
    } catch (error) {
      this.addOperation('initialization', 'process_matches', 'failed', { error: (error as Error).message });
      this.generateInvoiceFile();
      Profiling.error({
        error,
        source: 'MatchesDataProviderService.init',
      });
      throw error;
    }
  }

  public async updateRound(round: DB_SelectTournamentRound) {
    // Initialize invoice for update operation
    this.invoice.tournament = {
      id: round.tournamentId,
      label: 'Tournament (Update Round)',
    };
    this.invoice.operationType = 'update';

    this.addOperation('initialization', 'validate_input', 'started', { 
      roundId: round.id,
      roundSlug: round.slug,
      tournamentId: round.tournamentId
    });

    try {
      this.addOperation('initialization', 'validate_input', 'completed', { 
        roundSlug: round.slug 
      });

      const rawMatches = await this.getTournamentMatchesByRound(round);
      const query = await this.updateOnDatabase(rawMatches);

      // Generate invoice file at the very end
      this.generateInvoiceFile();

      return query;
    } catch (error) {
      this.addOperation('update', 'process_round_matches', 'failed', { error: (error as Error).message });
      this.generateInvoiceFile();
      Profiling.error({
        error,
        source: 'MatchesDataProviderService.updateRound',
      });
      throw error;
    }
  }
}
