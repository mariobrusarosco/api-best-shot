import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { T_DataProviderExecutions } from '@/domains/data-provider/schema';
import { TournamentDataProvider } from '@/domains/data-provider/services/tournaments';
import type { TournamentRequestIn } from '@/domains/data-provider/typing';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import db from '@/services/database';
import Profiling from '@/services/profiling';
import { randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { Request, Response } from 'express';

class AdminTournamentService {
  // Create tournament with admin context
  static async createTournament(req: TournamentRequestIn, res: Response) {
    const requestId = randomUUID();
    let scraper: BaseScraper | null = null;

    try {
      scraper = await BaseScraper.createInstance();
      const dataProviderService = new TournamentDataProvider(scraper, requestId);
      const tournament = await dataProviderService.init(req.body);

      return res.status(201).json({
        success: true,
        data: { tournament },
        message: `Tournament "${tournament.label}" created successfully`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_TOURNAMENT_create',
        error,
        data: {
          requestId,
          operation: 'admin_tournament_creation',
          adminUser: req.authenticatedUser?.nickName,
        },
      });
      return handleInternalServerErrorResponse(res, error);
    } finally {
      if (scraper) {
        await scraper.close();
        Profiling.log({
          msg: '[CLEANUP] Playwright resources cleaned up successfully',
          data: { requestId, source: 'admin_service' },
          source: 'ADMIN_SERVICE_TOURNAMENT_create',
        });
      }
    }
  }

  // Get all tournaments for admin
  static async getAllTournaments(_req: Request, res: Response) {
    try {
      const tournaments = await SERVICES_TOURNAMENT.getAllTournaments();

      return res.status(200).json({
        success: true,
        data: tournaments,
        message: 'Tournaments retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching tournaments for admin:', error);
      return handleInternalServerErrorResponse(res, error);
    }
  }

  // Get single tournament by ID for admin
  static async getTournamentById(req: Request, res: Response) {
    try {
      const { tournamentId } = req.params;

      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          message: 'Tournament ID is required',
        });
      }

      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);

      // Exclude rounds from admin response
      const { ...tournamentWithoutRounds } = tournament;

      return res.status(200).json({
        success: true,
        data: tournamentWithoutRounds,
        message: 'Tournament retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching tournament for admin:', error);
      if (error instanceof Error && error.message === 'Tournament not found') {
        return res.status(404).json({
          success: false,
          message: 'Tournament not found',
        });
      }
      return handleInternalServerErrorResponse(res, error);
    }
  }

  // Get execution jobs for a specific tournament
  static async getTournamentExecutionJobs(req: Request, res: Response) {
    try {
      const { tournamentId } = req.params;

      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          message: 'Tournament ID is required',
        });
      }

      // Verify tournament exists
      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);

      // Get limit from query params, default to 20
      const limit = parseInt(req.query.limit as string) || 20;
      const validLimit = Math.min(Math.max(1, limit), 100); // Limit between 1-100

      // Fetch execution jobs for the specific tournament
      const executionJobs = await db
        .select({
          id: T_DataProviderExecutions.id,
          operationType: T_DataProviderExecutions.operationType,
          status: T_DataProviderExecutions.status,
          summary: T_DataProviderExecutions.summary,
          reportUrl: T_DataProviderExecutions.reportFileUrl,
          createdAt: T_DataProviderExecutions.startedAt,
          endTime: T_DataProviderExecutions.completedAt,
          duration: T_DataProviderExecutions.duration,
        })
        .from(T_DataProviderExecutions)
        .where(eq(T_DataProviderExecutions.tournamentId, tournamentId))
        .orderBy(desc(T_DataProviderExecutions.startedAt))
        .limit(validLimit);

      // Transform the data to match the format
      const formattedJobs = executionJobs.map(job => {
        const summary = (job.summary as Record<string, unknown>) || {};
        return {
          id: job.id,
          operationType: job.operationType,
          status: job.status,
          summary: {
            totalOperations: summary.totalOperations || 0,
            successfulOperations: summary.successfulOperations || 0,
            failedOperations: summary.failedOperations || 0,
          },
          reportUrl: job.reportUrl,
          createdAt: job.createdAt,
          endTime: job.endTime,
          duration:
            job.duration ||
            (job.endTime && job.createdAt
              ? Math.round((new Date(job.endTime).getTime() - new Date(job.createdAt).getTime()) / 1000)
              : null),
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          tournament: {
            id: tournament.id,
            label: tournament.label,
          },
          executionJobs: formattedJobs,
          total: formattedJobs.length,
          limit: validLimit,
        },
        message: 'Tournament execution jobs retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching tournament execution jobs:', error);
      if (error instanceof Error && error.message === 'Tournament not found') {
        return res.status(404).json({
          success: false,
          message: 'Tournament not found',
        });
      }
      return handleInternalServerErrorResponse(res, error);
    }
  }
}

export { AdminTournamentService };
