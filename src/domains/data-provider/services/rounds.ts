import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { DataProviderExecution } from '@/domains/data-provider/services/execution';
import { MatchesDataProviderService } from '@/domains/data-provider/services/match';
import {
  API_SOFASCORE_ROUND,
  API_SOFASCORE_ROUNDS,
  DataProviderExecutionOperationType,
} from '@/domains/data-provider/typing';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { DB_InsertTournamentRound } from '@/domains/tournament-round/schema';
import type { ITournamentRoundType } from '@/domains/tournament-round/typing';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import type { TournamentMode } from '@/domains/tournament/typing';
import { randomUUID } from 'crypto';
import { DataProviderReport } from './report';

export interface CreateRoundsInput {
  tournamentId: string;
  baseUrl: string;
  label: string;
  provider: string;
}

const KNOCKOUT_DISCOVERY_ELIGIBLE_MODES: TournamentMode[] = ['regular-season-and-knockout', 'knockout-only'];

export type SyncTournamentKnockoutRoundsSummary = {
  tournamentSlug: string;
  updatedRoundSlugs: string[];
};

export type SyncEligibleTournamentsKnockoutRoundsSummary = {
  updatedRounds: Array<{ tournamentSlug: string; roundSlug: string }>;
  failedTournaments: Array<{ tournamentSlug: string; error: string }>;
};

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

  public static async updateKnockoutsForTournament(
    tournamentId: string,
    tournamentSlug?: string
  ): Promise<SyncTournamentKnockoutRoundsSummary> {
    const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
    const summary: SyncTournamentKnockoutRoundsSummary = {
      tournamentSlug: tournamentSlug || tournamentId,
      updatedRoundSlugs: [],
    };

    if (!KNOCKOUT_DISCOVERY_ELIGIBLE_MODES.includes(tournament.mode as TournamentMode)) {
      return summary;
    }

    let scraper: BaseScraper | null = null;

    try {
      scraper = await BaseScraper.createInstance();
      const roundsProvider = new RoundsDataProviderService(scraper, randomUUID());
      const roundsResponse = await roundsProvider.fetchRounds(tournament.baseUrl);
      const normalizedRounds = roundsProvider.enhanceRounds(tournament.baseUrl, tournament.id, roundsResponse);
      const normalizedKnockoutRounds = normalizedRounds.filter(round => round.type === 'knockout');

      const databaseRounds = await QUERIES_TOURNAMENT_ROUND.getAllRounds(tournament.id);
      const existingRoundSlugs = new Set(databaseRounds.map(round => round.slug));
      const discoveredRounds = normalizedKnockoutRounds.filter(round => !existingRoundSlugs.has(round.slug));

      if (discoveredRounds.length === 0) {
        return summary;
      }

      const matchesProvider = new MatchesDataProviderService(scraper, randomUUID());

      for (const discoveredRound of discoveredRounds) {
        try {
          const rawRound = await RoundsDataProviderService.fetchRoundEvents(scraper, discoveredRound.providerUrl);
          const hasEvents = !!rawRound?.events?.length;

          if (!hasEvents) {
            continue;
          }

          const [upsertedRound] = await QUERIES_TOURNAMENT_ROUND.upsertTournamentRounds([discoveredRound]);

          if (!upsertedRound) {
            throw new Error(`Could not persist round "${discoveredRound.slug}"`);
          }

          await matchesProvider.updateRound(upsertedRound, tournament.label);
          summary.updatedRoundSlugs.push(upsertedRound.slug);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Received status 404')) {
            continue;
          }
        }
      }

      return summary;
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  }

  public static async updateKnockouts(): Promise<SyncEligibleTournamentsKnockoutRoundsSummary> {
    const tournaments = await SERVICES_TOURNAMENT.listActiveTournamentsByModes(KNOCKOUT_DISCOVERY_ELIGIBLE_MODES);
    const summary: SyncEligibleTournamentsKnockoutRoundsSummary = {
      updatedRounds: [],
      failedTournaments: [],
    };

    for (const tournament of tournaments) {
      try {
        const tournamentSummary = await RoundsDataProviderService.updateKnockoutsForTournament(
          tournament.id,
          tournament.slug
        );
        for (const roundSlug of tournamentSummary.updatedRoundSlugs) {
          summary.updatedRounds.push({
            tournamentSlug: tournamentSummary.tournamentSlug,
            roundSlug,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        summary.failedTournaments.push({
          tournamentSlug: tournament.slug,
          error: errorMessage,
        });

        Logger.error(error instanceof Error ? error : new Error(errorMessage), {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'updateKnockouts',
          tournamentId: tournament.id,
        });
      }
    }

    return summary;
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

      // ------ GENERATE REPORT EVEN ON FAILURE (with fallback) ------
      let reportUploadResult: { s3Key?: string; s3Url?: string } = {};
      try {
        reportUploadResult = await this.reporter.createFileAndUpload();
      } catch (reportError) {
        Logger.error(reportError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'init',
          context: 'report_upload_failed',
          requestId: this.requestId,
          originalError: errorMessage,
        });
      }

      // ------ MARK EXECUTION AS FAILED (always notify) ------
      const reportSummaryResult = this.reporter.getSummary();
      try {
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
      } catch (notificationError) {
        Logger.error(notificationError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'init',
          context: 'notification_failed',
          requestId: this.requestId,
          originalError: errorMessage,
        });
      }

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

      // ------ GENERATE REPORT EVEN ON FAILURE (with fallback) ------
      let reportUploadResult: { s3Key?: string; s3Url?: string } = {};
      try {
        reportUploadResult = await this.reporter.createFileAndUpload();
      } catch (reportError) {
        Logger.error(reportError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'update',
          context: 'report_upload_failed',
          requestId: this.requestId,
          originalError: errorMessage,
        });
      }

      // ------ MARK EXECUTION AS FAILED (always notify) ------
      const reportSummaryResult = this.reporter.getSummary();
      try {
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
      } catch (notificationError) {
        Logger.error(notificationError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'update',
          context: 'notification_failed',
          requestId: this.requestId,
          originalError: errorMessage,
        });
      }

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
      const rawContent = (await this.scraper.getPageContent()) as API_SOFASCORE_ROUNDS;

      if (!rawContent?.rounds || rawContent?.rounds?.length === 0) {
        this.reporter.addOperation('scraping', 'fetch_rounds', 'completed', {
          note: 'No rounds data found',
        });
        return {
          currentRound: { round: 0, name: '', slug: '' },
          rounds: [],
        };
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

  private enhanceRounds(baseUrl: string, tournamentId: string, roundsResponse: API_SOFASCORE_ROUNDS) {
    this.reporter.addOperation('transformation', 'enhance_rounds', 'started', {
      baseUrl,
      tournamentId,
      rawRoundsCount: roundsResponse.rounds.length,
    });

    try {
      const enhancedRounds = roundsResponse.rounds.map((round: unknown, index: number) => {
        const roundData = round as {
          prefix?: string;
          name?: string;
          round: number;
          slug?: string;
        };
        const isSpecialRound = !!roundData?.prefix;
        const isKnockoutRound = !isSpecialRound && !!roundData?.name;
        const isRegularRound = !isSpecialRound && !isKnockoutRound;

        const order = index + 1;
        let endpoint = `${baseUrl}/events/round/${roundData.round}`;
        let slug = '';
        let label = '';

        if (isKnockoutRound) {
          endpoint += `/slug/${roundData.slug}`;
          slug += `${roundData.slug}`;
          label = roundData.name || order.toString();
        } else if (isSpecialRound) {
          endpoint += `/slug/${roundData.slug}/prefix/${roundData.prefix}`;
          slug += `${roundData.prefix}-${roundData.slug}`;
          label = roundData.prefix!;
        } else if (isRegularRound) {
          slug += roundData.round;
          label = roundData.round.toString();
        }

        return {
          providerUrl: endpoint,
          providerId: String(roundData.round),
          tournamentId: tournamentId,
          order: order,
          label: label,
          slug: slug.toLowerCase(),
          knockoutId: roundData.prefix,
          type: (isKnockoutRound || isSpecialRound ? 'knockout' : 'season') as ITournamentRoundType,
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
      Logger.error(new Error(errorMessage), {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'createOnDatabase',
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
      Logger.error(error, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'updateOnDatabase',
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
      Logger.error(error as Error, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'updateOnDatabase',
      });
      throw error;
    }
  }

  private static async fetchRoundEvents(
    scraper: BaseScraper,
    providerUrl: string
  ): Promise<API_SOFASCORE_ROUND | null> {
    await scraper.goto(providerUrl);
    const roundPayload = (await scraper.getPageContent()) as API_SOFASCORE_ROUND | null;

    if (!roundPayload || !Array.isArray(roundPayload.events)) {
      return null;
    }

    return roundPayload;
  }
}
