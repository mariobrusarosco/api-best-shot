import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { DataProviderExecution } from '@/domains/data-provider/services/execution';
import { DataProviderReport } from './reporter';
import { DataProviderExecutionOperationType } from '@/domains/data-provider/typing';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { DB_InsertTournamentRound } from '@/domains/tournament-round/schema';
import { Profiling } from '@/services/profiling';

export interface CreateRoundsInput {
  tournamentId: string;
  baseUrl: string;
  label: string;
  provider: string;
}

export class RoundsDataProviderService {
  private scraper: BaseScraper;
  private reporter: DataProviderReport;
  private requestId: string;
  private execution: DataProviderExecution | null = null;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.requestId = requestId;
    this.reporter = new DataProviderReport(requestId);
  }

  public async init(payload: CreateRoundsInput) {
    // Create execution tracking
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: payload.tournamentId,
      operationType: DataProviderExecutionOperationType.ROUNDS_CREATE,
    });
    this.reporter.setTournamentInfo({
      label: payload.label,
      tournamentId: payload.tournamentId,
      provider: payload.provider,
    });

    try {
      // ------ INPUT VALIDATION ------
      this.validateTournament(payload);
      // ------ FETCH ROUNDS ------
      const fetchedRounds = await this.fetchRounds(payload.baseUrl);
      // ------ ENHANCE ROUNDS ------
      const enhancedRounds = this.enhanceRounds(payload.baseUrl, payload.tournamentId, fetchedRounds);
      // ------ CREATE ROUNDS ------
      const createdRounds = await this.createOnDatabase(enhancedRounds);
      // ------ UPLOAD REPORT ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ GENERATE REPORT SUMMARY ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS COMPLETED ------
      await this.execution?.complete({
        reportFileKey: reportUploadResult?.s3Key,
        reportFileUrl: reportUploadResult?.s3Url,
        tournamentLabel: payload.label,
        summary: {
          tournamentId: payload.tournamentId,
          tournamentLabel: payload.label,
          provider: payload.provider,
          roundsCount: createdRounds.length,
          ...reportSummaryResult,
        },
      });

      return createdRounds;
    } catch (error) {
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT EVEN ON FAILURE ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ MARK EXECUTION AS FAILED ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS FAILED ------
      await this.execution?.failure({
        reportFileKey: reportUploadResult.s3Key,
        reportFileUrl: reportUploadResult.s3Url,
        tournamentLabel: payload.label,
        error: errorMessage,
        summary: {
          error: errorMessage,
          ...reportSummaryResult,
        },
      });

      throw error;
    }
  }

  public async update(payload: CreateRoundsInput) {
    // Create execution tracking
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: payload.tournamentId,
      operationType: DataProviderExecutionOperationType.ROUNDS_UPDATE,
    });
    this.reporter.setTournamentInfo({
      label: payload.label,
      tournamentId: payload.tournamentId,
      provider: payload.provider,
    });

    try {
      // ------ INPUT VALIDATION ------
      this.validateTournament(payload);
      // ------ FETCH ROUNDS ------
      const fetchedRounds = await this.fetchRounds(payload.baseUrl);
      // ------ ENHANCE ROUNDS ------
      const enhancedRounds = this.enhanceRounds(payload.baseUrl, payload.tournamentId, fetchedRounds);
      // ------ UPDATE ROUNDS ------
      const updatedRounds = await this.updateOnDatabase(enhancedRounds);
      // ------ UPLOAD REPORT ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ GENERATE REPORT SUMMARY ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS COMPLETED ------
      await this.execution?.complete({
        reportFileKey: reportUploadResult?.s3Key,
        reportFileUrl: reportUploadResult?.s3Url,
        tournamentLabel: payload.label,
        summary: {
          tournamentId: payload.tournamentId,
          tournamentLabel: payload.label,
          provider: payload.provider,
          roundsCount: updatedRounds.length,
          ...reportSummaryResult,
        },
      });

      return updatedRounds;
    } catch (error) {
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT EVEN ON FAILURE ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ MARK EXECUTION AS FAILED ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS FAILED ------
      await this.execution?.failure({
        reportFileKey: reportUploadResult.s3Key,
        reportFileUrl: reportUploadResult.s3Url,
        tournamentLabel: payload.label,
        error: errorMessage,
        summary: {
          error: errorMessage,
          ...reportSummaryResult,
        },
      });

      throw error;
    }
  }

  private validateTournament(payload: CreateRoundsInput) {
    // ------ INPUT VALIDATION ------
    this.reporter.addOperation('initialization', 'validate_input', 'started');

    // Validate input
    if (!payload.tournamentId) {
      this.reporter.addOperation('initialization', 'validate_input', 'failed', {
        error: 'Tournament ID is null',
      });

      throw new Error('Tournament ID is null');
    }

    this.reporter.addOperation('initialization', 'validate_input', 'completed');
  }

  private async fetchRounds(baseUrl: string) {
    this.reporter.addOperation('scraping', 'fetch_rounds', 'started');

    try {
      // Fetch rounds from tournament
      const url = `${baseUrl}/rounds`;
      await this.scraper.goto(url);
      const rawContent = await this.scraper.getPageContent();

      if (!rawContent?.rounds || rawContent?.rounds?.length === 0) {
        this.reporter.addOperation('scraping', 'fetch_rounds', 'completed', {
          note: 'No rounds data found',
        });
        return [];
      }

      this.reporter.addOperation('scraping', 'fetch_rounds', 'completed', {
        roundsCount: rawContent.rounds.length,
      });

      return rawContent;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('scraping', 'fetch_rounds', 'failed', {
        error: errorMessage,
      });
      throw error;
    }
  }

  private enhanceRounds(baseUrl: string, tournamentId: string, roundsResponse: any) {
    this.reporter.addOperation('transformation', 'enhance_rounds', 'started', {
      baseUrl,
      tournamentId,
      rawRoundsCount: roundsResponse.rounds.length,
    });

    try {
      const enhancedRounds = roundsResponse.rounds.map((round: any, index: number) => {
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
        };
      });

      this.reporter.addOperation('transformation', 'enhance_rounds', 'completed', {
        enhancedRoundsCount: enhancedRounds.length,
        roundTypes: {
          regular: enhancedRounds.filter(r => r.type === 'season').length,
          knockout: enhancedRounds.filter(r => r.type === 'knockout').length,
        },
      });

      return enhancedRounds;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('transformation', 'enhance_rounds', 'failed', {
        error: errorMessage,
      });
      throw error;
    }
  }

  public async createOnDatabase(rounds: DB_InsertTournamentRound[]) {
    this.reporter.addOperation('database', 'create_rounds', 'started', {
      roundsCount: rounds.length,
    });

    try {
      const query = await QUERIES_TOURNAMENT_ROUND.upsertTournamentRounds(rounds);

      this.reporter.addOperation('database', 'create_rounds', 'completed', {
        createdRoundsCount: query.length,
      });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.reporter.addOperation('database', 'create_rounds', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'RoundsDataProviderService.createOnDatabase',
      });
      throw error;
    }
  }

  public async updateOnDatabase(rounds: DB_InsertTournamentRound[]): Promise<DB_InsertTournamentRound[]> {
    this.reporter.addOperation('database', 'update_rounds', 'started', {
      roundsCount: rounds.length,
    });

    if (rounds.length === 0) {
      this.reporter.addOperation('database', 'update_rounds', 'failed', {
        error: 'No rounds to update',
      });
      const error = new Error('No rounds to update in the database');
      Profiling.error({
        error,
        source: 'RoundsDataProviderService.updateOnDatabase',
      });
      throw error;
    }

    try {
      const query = await QUERIES_TOURNAMENT_ROUND.upsertTournamentRounds(rounds);

      this.reporter.addOperation('database', 'update_rounds', 'completed', {
        updatedRoundsCount: Array.isArray(query) ? query.length : 0,
      });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.reporter.addOperation('database', 'update_rounds', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        source: 'RoundsDataProviderService.updateOnDatabase',
      });
      throw error;
    }
  }
}
