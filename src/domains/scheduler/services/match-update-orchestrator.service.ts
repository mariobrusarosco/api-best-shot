/**
 * Match Update Orchestrator Service
 *
 * Coordinates automated match updates by:
 * 1. Finding matches that need updates (via polling)
 * 2. Updating each match individually using SofaScore's match-specific API
 * 3. Triggering standings updates when matches end
 * 4. Tracking execution and updating lastCheckedAt timestamps
 */

import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchesDataProviderService } from '@/domains/data-provider/services/matches';
import { retryMatchOperation } from '@/domains/data-provider/utils/retry';
import { DB_SelectMatch } from '@/domains/match/schema';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import { MatchPollingService } from './match-polling.service';

export class MatchUpdateOrchestratorService {
  private pollingService: MatchPollingService;
  private scraper: BaseScraper;

  constructor(scraper: BaseScraper) {
    this.pollingService = new MatchPollingService();
    this.scraper = scraper;
  }

  /**
   * Main orchestration method: Find and update all matches needing updates
   * Now processes each match individually using SofaScore's match-specific API
   */
  async processMatchUpdates(): Promise<{
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

        // If match just ended, mark tournament for standings update
        if (wasMatchEnded) {
          tournamentsNeedingStandingsUpdate.add(match.tournamentId);
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

    // Create unique request ID for tracking
    const requestId = `scheduler-${Date.now()}-${match.externalId}`;

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
   * TODO: Implement standings update service call
   */
  private async updateTournamentStandings(tournamentId: string): Promise<void> {
    console.log(`[MatchUpdateOrchestrator] Updating standings for tournament: ${tournamentId}`);

    // TODO: Call standings service here
    // For now, just log that it should happen
    console.log(`[MatchUpdateOrchestrator] Standings update for ${tournamentId} - TO BE IMPLEMENTED`);
  }

  /**
   * Get current polling statistics
   */
  async getStats() {
    return this.pollingService.getPollingStats();
  }
}
