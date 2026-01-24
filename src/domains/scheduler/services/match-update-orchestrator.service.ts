/**
 * Match Update Orchestrator Service
 *
 * Coordinates automated match updates by:
 * 1. Finding matches that need updates (via polling)
 * 2. Updating each match individually using SofaScore's match-specific API
 * 3. Triggering standings updates when matches end
 * 4. Tracking execution and updating lastCheckedAt timestamps
 * 5. Queue-based processing for concurrent match updates (when enabled)
 */

import { randomUUID } from 'crypto';
import type { Job } from 'pg-boss';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchesDataProviderService } from '@/domains/data-provider/services/matches';
import { StandingsDataProviderService } from '@/domains/data-provider/services/standings';
import { retryMatchOperation } from '@/domains/data-provider/utils/retry';
import { DB_SelectMatch } from '@/domains/match/schema';
import { ScoreboardService } from '@/domains/score/services/scoreboard.service';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import type { IQueue } from '@/services/queue';
import { getQueue } from '@/services/queue';
import { MatchPollingService } from './match-polling.service';

/**
 * Job data structure for match update jobs
 */
type MatchUpdateJobData = {
  matchId: string;
  matchExternalId: string;
  tournamentId: string;
  roundSlug: string;
  provider: string;
  previousStatus: string;
};

export class MatchUpdateOrchestratorService {
  private pollingService: MatchPollingService;
  private scraper: BaseScraper;

  constructor(scraper: BaseScraper) {
    this.pollingService = new MatchPollingService();
    this.scraper = scraper;
  }

  /**
   * Register queue workers for concurrent match processing
   *
   * Sets up pg-boss workers that will process match update jobs in parallel.
   * Workers reuse the existing updateSingleMatchWithRetry logic, ensuring
   * scoreboard updates and standings updates are handled correctly.
   *
   * @param queue - Queue instance for job processing
   */
  async registerWorkers(queue: IQueue): Promise<void> {
    const QUEUE_NAME = 'update-match';

    console.log('[MatchUpdateOrchestrator] Registering queue workers...');

    // Create the queue
    await queue.createQueue(QUEUE_NAME);

    // Register worker with concurrency settings
    await queue.work<MatchUpdateJobData>(
      QUEUE_NAME,
      {
        teamSize: 10, // 10 concurrent workers
        teamConcurrency: 1, // Each worker processes 1 job at a time
      },
      async (jobs: Job<MatchUpdateJobData>[]) => {
        // Process each job in the batch
        for (const job of jobs) {
          await this.processMatchJob(job.data);
        }
      }
    );

    console.log('[MatchUpdateOrchestrator] ✅ Queue workers registered successfully');
    console.log('[MatchUpdateOrchestrator] Configuration: 10 workers, 3 retry attempts with exponential backoff');
  }

  /**
   * Process a single match update job
   *
   * This method is called by queue workers and reuses the existing
   * updateSingleMatchWithRetry logic to ensure consistent behavior
   * between direct and queue-based processing.
   *
   * Includes scoreboard updates when matches end.
   *
   * @param jobData - Match update job data
   */
  private async processMatchJob(jobData: MatchUpdateJobData): Promise<void> {
    console.log(`[MatchUpdateOrchestrator] [Job] Processing match: ${jobData.matchExternalId}`);

    try {
      // Fetch tournament data
      const tournament = await QUERIES_TOURNAMENT.tournament(jobData.tournamentId);

      if (!tournament) {
        throw new Error(`Tournament ${jobData.tournamentId} not found`);
      }

      // Create unique request ID for tracking
      const requestId = randomUUID();

      // Execute update with retry logic
      const updatedMatch = await retryMatchOperation(async () => {
        const matchesService = new MatchesDataProviderService(this.scraper, requestId);
        return await matchesService.updateSingleMatch({
          matchExternalId: jobData.matchExternalId,
          tournamentId: jobData.tournamentId,
          roundSlug: jobData.roundSlug,
          label: tournament.label,
          provider: jobData.provider,
        });
      }, `Match update: ${tournament.label} - ${jobData.matchExternalId}`);

      // Mark match as checked
      await this.pollingService.markMatchAsChecked(jobData.matchId);

      console.log(`[MatchUpdateOrchestrator] [Job] Successfully updated match: ${jobData.matchExternalId}`);

      // Check if match transitioned to "ended" status
      const matchJustEnded = jobData.previousStatus !== 'ended' && updatedMatch.status === 'ended';

      // If match just ended, trigger scoreboard updates and queue standings update
      if (matchJustEnded) {
        console.log(`[MatchUpdateOrchestrator] [Job] Match ended, updating scoreboard for match: ${jobData.matchId}`);

        // Update Scoreboard (Calculate & Dual-Write to PostgreSQL + Redis)
        try {
          const deltas = await ScoreboardService.calculateMatchPoints(jobData.matchId);
          await ScoreboardService.applyScoreUpdates(jobData.tournamentId, deltas);
          console.log(`[MatchUpdateOrchestrator] [Job] Scoreboard updated successfully for match: ${jobData.matchId}`);
        } catch (scoreboardError) {
          console.error(
            `[MatchUpdateOrchestrator] [Job] Scoreboard update failed for match ${jobData.matchId}:`,
            scoreboardError
          );
          // Swallow error - scoreboard failures don't break match processing
        }

        // Update tournament standings
        try {
          await this.updateTournamentStandings(jobData.tournamentId);
        } catch (standingsError) {
          console.error(
            `[MatchUpdateOrchestrator] [Job] Standings update failed for tournament ${jobData.tournamentId}:`,
            standingsError
          );
          // Swallow error - standings failures don't break match processing
        }
      }
    } catch (error) {
      console.error(`[MatchUpdateOrchestrator] [Job] Failed to process match ${jobData.matchExternalId}:`, error);

      // Mark match as checked even on failure to avoid retrying too soon
      try {
        await this.pollingService.markMatchAsChecked(jobData.matchId);
      } catch (markError) {
        console.error(`[MatchUpdateOrchestrator] [Job] Failed to mark match ${jobData.matchId} as checked:`, markError);
      }

      // Re-throw to trigger pg-boss retry logic
      throw error;
    }
  }

  /**
   * Main orchestration method: Find and update all matches needing updates
   *
   * This method intelligently routes to either queue-based or direct processing:
   * - If queue is available: Queues jobs for concurrent processing
   * - If queue is unavailable: Falls back to direct sequential processing
   */
  async processMatchUpdates(): Promise<{
    processed: number;
    successful?: number;
    failed?: number;
    standingsUpdated?: number;
    queued?: number;
  }> {
    const queue = await getQueue();

    if (queue) {
      // Queue-based processing (concurrent)
      return this.processMatchUpdatesQueued(queue);
    } else {
      // Direct processing (sequential fallback)
      console.warn('[MatchUpdateOrchestrator] Queue unavailable, falling back to direct processing');
      return this.processMatchUpdatesDirect();
    }
  }

  /**
   * Queue-based match processing (concurrent)
   *
   * Queues individual jobs for each match needing updates.
   * Workers process jobs concurrently (10 workers by default).
   *
   * @param queue - Queue instance for job queueing
   */
  private async processMatchUpdatesQueued(queue: IQueue): Promise<{
    processed: number;
    queued: number;
  }> {
    console.log('[MatchUpdateOrchestrator] Starting queue-based match update process...');

    // Step 1: Find matches needing updates
    const matchesNeedingUpdate = await this.pollingService.findMatchesNeedingUpdate();

    if (matchesNeedingUpdate.length === 0) {
      console.log('[MatchUpdateOrchestrator] No matches need updating at this time');
      return { processed: 0, queued: 0 };
    }

    console.log(`[MatchUpdateOrchestrator] Found ${matchesNeedingUpdate.length} matches needing updates`);

    // Step 2: Queue individual jobs for each match
    let queuedCount = 0;
    const QUEUE_NAME = 'update-match';

    for (const match of matchesNeedingUpdate) {
      try {
        const jobData: MatchUpdateJobData = {
          matchId: match.id,
          matchExternalId: match.externalId,
          tournamentId: match.tournamentId,
          roundSlug: match.roundSlug,
          provider: match.provider,
          previousStatus: match.status,
        };

        await queue.send(QUEUE_NAME, jobData, {
          retryLimit: 3,
          retryDelay: 30, // 30 seconds
          retryBackoff: true, // Exponential: 30s, 60s, 120s
          expireInHours: 2, // Jobs expire after 2 hours if not processed
        });

        queuedCount++;
      } catch (error) {
        console.error(`[MatchUpdateOrchestrator] Failed to queue match ${match.id}:`, error);
      }
    }

    console.log(
      `[MatchUpdateOrchestrator] Queued ${queuedCount}/${matchesNeedingUpdate.length} matches for processing`
    );

    return {
      processed: matchesNeedingUpdate.length,
      queued: queuedCount,
    };
  }

  /**
   * Direct sequential match processing (fallback)
   *
   * Processes matches one by one in sequence.
   * Used when queue is unavailable.
   */
  private async processMatchUpdatesDirect(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    standingsUpdated: number;
  }> {
    console.log('[MatchUpdateOrchestrator] Starting match update process...');

    // Step 1: Find matches needing updates
    const matchesNeedingUpdate = await this.pollingService.findMatchesNeedingUpdate();

    if (matchesNeedingUpdate.length === 0) {
      console.log('[MatchUpdateOrchestrator] No matches need updating at this time');
      return { processed: 0, successful: 0, failed: 0, standingsUpdated: 0 };
    }

    console.log(`[MatchUpdateOrchestrator] Found ${matchesNeedingUpdate.length} matches needing updates`);

    // Step 2: Process each match individually
    let successful = 0;
    let failed = 0;
    const tournamentsNeedingStandingsUpdate = new Set<string>();

    for (const match of matchesNeedingUpdate) {
      try {
        const wasMatchEnded = await this.updateSingleMatchWithRetry(match);

        // If match just ended, trigger Scoreboard updates and mark for standings update
        if (wasMatchEnded) {
          tournamentsNeedingStandingsUpdate.add(match.tournamentId);

          // Update Scoreboard (Calculate & Dual-Write)
          try {
            console.log(`[MatchUpdateOrchestrator] Updating scoreboard for match: ${match.id}`);
            const deltas = await ScoreboardService.calculateMatchPoints(match.id);
            await ScoreboardService.applyScoreUpdates(match.tournamentId, deltas);
            console.log(`[MatchUpdateOrchestrator] Scoreboard updated successfully for match: ${match.id}`);
          } catch (scoreboardError) {
            console.error(`[MatchUpdateOrchestrator] Scoreboard update failed for match ${match.id}:`, scoreboardError);
            // We swallow the error to ensure the Orchestrator continues processing other matches.
            // In a real production system, this should alert Sentry.
          }
        }

        successful++;
      } catch (error) {
        console.error(`[MatchUpdateOrchestrator] Failed to update match ${match.externalId}:`, error);
        failed++;

        // Mark match as checked even on failure to avoid retrying too soon
        try {
          await this.pollingService.markMatchAsChecked(match.id);
        } catch (markError) {
          console.error(`[MatchUpdateOrchestrator] Failed to mark match ${match.id} as checked:`, markError);
        }
      }
    }

    // Step 3: Update standings for tournaments that had matches finish
    let standingsUpdated = 0;
    if (tournamentsNeedingStandingsUpdate.size > 0) {
      console.log(
        `[MatchUpdateOrchestrator] Updating standings for ${tournamentsNeedingStandingsUpdate.size} tournament(s)...`
      );

      for (const tournamentId of tournamentsNeedingStandingsUpdate) {
        try {
          await this.updateTournamentStandings(tournamentId);
          standingsUpdated++;
        } catch (error) {
          console.error(`[MatchUpdateOrchestrator] Failed to update standings for tournament ${tournamentId}:`, error);
        }
      }
    }

    console.log(
      `[MatchUpdateOrchestrator] Completed: ${successful} successful, ${failed} failed, ${standingsUpdated} standings updated`
    );

    return {
      processed: matchesNeedingUpdate.length,
      successful,
      failed,
      standingsUpdated,
    };
  }

  /**
   * Update a single match with retry logic
   * Returns true if the match transitioned to "ended" status
   */
  private async updateSingleMatchWithRetry(match: DB_SelectMatch): Promise<boolean> {
    console.log(`[MatchUpdateOrchestrator] Updating match: ${match.externalId}`);

    // Store previous status to detect if match just ended
    const previousStatus = match.status;

    // Fetch tournament data
    const tournament = await QUERIES_TOURNAMENT.tournament(match.tournamentId);

    if (!tournament) {
      throw new Error(`Tournament ${match.tournamentId} not found`);
    }

    // Create unique request ID for tracking (must be valid UUID)
    const requestId = randomUUID();

    // Execute update with retry logic
    const updatedMatch = await retryMatchOperation(async () => {
      const matchesService = new MatchesDataProviderService(this.scraper, requestId);
      return await matchesService.updateSingleMatch({
        matchExternalId: match.externalId,
        tournamentId: match.tournamentId,
        roundSlug: match.roundSlug,
        label: tournament.label,
        provider: match.provider,
      });
    }, `Match update: ${tournament.label} - ${match.externalId}`);

    // Mark match as checked
    await this.pollingService.markMatchAsChecked(match.id);

    console.log(`[MatchUpdateOrchestrator] Successfully updated match: ${match.externalId}`);

    // Check if match transitioned to "ended" status
    const matchJustEnded = previousStatus !== 'ended' && updatedMatch.status === 'ended';

    return matchJustEnded;
  }

  /**
   * Update tournament standings
   * Called when matches finish to ensure standings reflect latest results
   */
  private async updateTournamentStandings(tournamentId: string): Promise<void> {
    console.log(`[MatchUpdateOrchestrator] Updating standings for tournament: ${tournamentId}`);

    // Fetch tournament data
    const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);

    if (!tournament) {
      console.error(`[MatchUpdateOrchestrator] Tournament ${tournamentId} not found, skipping standings update`);
      return;
    }

    // Skip standings update for knockout-only tournaments (they don't have standings)
    if (tournament.mode === 'knockout-only') {
      console.log(
        `[MatchUpdateOrchestrator] Skipping standings update for knockout-only tournament: ${tournament.label}`
      );
      return;
    }

    // Create unique request ID for tracking (must be valid UUID)
    const requestId = randomUUID();

    try {
      // Execute standings update with retry logic
      await retryMatchOperation(async () => {
        const standingsService = new StandingsDataProviderService(this.scraper, requestId);
        return await standingsService.update({
          tournamentId,
          baseUrl: tournament.baseUrl,
          label: tournament.label,
          provider: tournament.provider,
        });
      }, `Standings update: ${tournament.label}`);

      console.log(`[MatchUpdateOrchestrator] Successfully updated standings for tournament: ${tournamentId}`);
    } catch (error) {
      // Don't throw - we don't want standings failures to break the match update process
      console.error(`[MatchUpdateOrchestrator] Failed to update standings for tournament ${tournamentId}:`, error);
    }
  }

  /**
   * Get current polling statistics
   */
  async getStats() {
    return this.pollingService.getPollingStats();
  }
}
