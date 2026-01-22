/**
 * Admin API - Scheduler
 *
 * Manual triggers for automated tasks (testing & debugging)
 */

import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchUpdateOrchestratorService } from '@/domains/scheduler/services/match-update-orchestrator.service';
import type { Request, Response } from 'express';

export const API_ADMIN_SCHEDULER = {
  /**
   * Manually trigger match update polling
   * Useful for testing without waiting for cron schedule
   *
   * POST /api/v2/admin/scheduler/trigger-match-polling
   */
  triggerMatchPolling: async (_req: Request, res: Response) => {
    console.log('[Admin API] Manual match polling trigger requested');

    let scraper: BaseScraper | null = null;

    try {
      // Initialize browser
      console.log('[Admin API] Initializing browser...');
      scraper = await BaseScraper.createInstance();

      // Create orchestrator
      const orchestrator = new MatchUpdateOrchestratorService(scraper);

      // Get stats before update
      const statsBefore = await orchestrator.getStats();
      console.log('[Admin API] Stats before:', statsBefore);

      // Run match update process
      console.log('[Admin API] Running match update process...');
      const startTime = Date.now();
      const result = await orchestrator.processMatchUpdates();
      const duration = Date.now() - startTime;

      console.log('[Admin API] Match polling completed successfully');

      // Return results
      res.status(200).json({
        success: true,
        message: 'Match polling completed successfully',
        data: {
          statsBefore,
          results: {
            processed: result.processed,
            successful: result.successful,
            failed: result.failed,
            standingsUpdated: result.standingsUpdated,
          },
          duration: `${(duration / 1000).toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[Admin API] Match polling failed:', error);

      res.status(500).json({
        success: false,
        error: 'Match polling failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      // Always close browser
      if (scraper) {
        console.log('[Admin API] Closing browser...');
        await scraper.close();
      }
    }
  },

  /**
   * Get current polling statistics
   * Shows how many matches need updates
   *
   * GET /api/v2/admin/scheduler/stats
   */
  getPollingStats: async (_req: Request, res: Response) => {
    console.log('[Admin API] Polling stats requested');

    let scraper: BaseScraper | null = null;

    try {
      // Initialize browser (needed for orchestrator)
      scraper = await BaseScraper.createInstance();
      const orchestrator = new MatchUpdateOrchestratorService(scraper);

      // Get stats
      const stats = await orchestrator.getStats();

      res.status(200).json({
        success: true,
        message: 'Polling stats retrieved successfully',
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Admin API] Failed to get polling stats:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get polling stats',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  },
};
