/**
 * Admin API - Scheduler
 *
 * Manual triggers for automated tasks (testing & debugging)
 */

import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchUpdateOrchestratorService } from '@/domains/scheduler/services/match-update-orchestrator.service';
import { getQueue } from '@/services/queue';
import type { Request, Response } from 'express';

export const API_ADMIN_SCHEDULER = {
  /**
   * Manually trigger match update polling
   * Useful for testing without waiting for cron schedule
   *
   * POST /api/v2/admin/scheduler/trigger-match-polling
   *
   * Routes to queue-based processing if available, otherwise falls back to direct processing
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

      // Run match update process (automatically uses queue if available)
      console.log('[Admin API] Running match update process...');
      const startTime = Date.now();
      const result = await orchestrator.processMatchUpdates();
      const duration = Date.now() - startTime;

      console.log('[Admin API] Match polling completed successfully');

      // Build response based on processing mode
      const responseData: any = {
        statsBefore,
        results: {
          processed: result.processed,
        },
        duration: `${(duration / 1000).toFixed(2)}s`,
        timestamp: new Date().toISOString(),
      };

      // Queue-based processing
      if (result.queued !== undefined) {
        responseData.processingMode = 'concurrent';
        responseData.results.queued = result.queued;
        responseData.message = 'Jobs queued for concurrent processing by background workers';
      }
      // Direct processing
      else {
        responseData.processingMode = 'sequential';
        responseData.results.successful = result.successful;
        responseData.results.failed = result.failed;
        responseData.results.standingsUpdated = result.standingsUpdated;
        responseData.message = 'Processed sequentially';
      }

      // Return results
      res.status(200).json({
        success: true,
        message: 'Match polling completed successfully',
        data: responseData,
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

  /**
   * Get queue health and statistics
   * Shows queue status, pending jobs, active workers, and job counts
   *
   * GET /api/v2/admin/scheduler/queue-stats
   */
  getQueueStats: async (_req: Request, res: Response) => {
    console.log('[Admin API] Queue stats requested');

    try {
      const queue = await getQueue();

      if (!queue) {
        res.status(200).json({
          success: true,
          message: 'Queue service unavailable',
          data: {
            available: false,
            mode: 'sequential',
            message: 'System is using sequential processing (queue not initialized)',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Access underlying pg-boss for advanced stats
      const pgBoss = (queue as any).getUnderlyingQueue();

      // Get queue size for update-match queue
      const queueName = 'update-match';
      const queueSize = await pgBoss.getQueueSize(queueName);

      res.status(200).json({
        success: true,
        message: 'Queue stats retrieved successfully',
        data: {
          available: true,
          mode: 'concurrent',
          queue: {
            name: queueName,
            pendingJobs: queueSize,
          },
          workers: {
            count: 10,
            concurrency: 1,
          },
          retryPolicy: {
            attempts: 3,
            backoff: 'exponential',
            delays: '30s → 60s → 120s',
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Admin API] Failed to get queue stats:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get queue stats',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  },

  /**
   * Get status of a specific job
   * Useful for tracking manually triggered jobs
   *
   * GET /api/v2/admin/scheduler/jobs/:jobId
   */
  getJobStatus: async (req: Request, res: Response) => {
    const { jobId } = req.params;
    console.log(`[Admin API] Job status requested for job: ${jobId}`);

    try {
      const queue = await getQueue();

      if (!queue) {
        res.status(503).json({
          success: false,
          error: 'Queue service unavailable',
          message: 'Queue is not initialized',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const queueName = 'update-match';
      const job = await queue.getJobById(queueName, jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
          message: `No job found with ID: ${jobId}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Calculate job duration if applicable
      let duration: string | undefined;
      if (job.startedOn && job.completedOn) {
        const durationMs = job.completedOn.getTime() - job.startedOn.getTime();
        duration = `${(durationMs / 1000).toFixed(2)}s`;
      }

      res.status(200).json({
        success: true,
        message: 'Job status retrieved successfully',
        data: {
          jobId: job.id,
          state: job.state,
          matchId: job.data.matchId,
          matchExternalId: job.data.matchExternalId,
          tournamentId: job.data.tournamentId,
          createdOn: job.createdOn,
          startedOn: job.startedOn,
          completedOn: job.completedOn,
          duration,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Admin API] Failed to get job status:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  },
};
