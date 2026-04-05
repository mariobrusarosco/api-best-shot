import db from '@/core/database';
import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type { TournamentCreateInput } from '@/domains/data-provider-v2/contracts/tournament-create';
import { runTournamentCreateOperation } from '@/domains/data-provider-v2/operations/tournament-create/tournament-operation-runner';
import type { TournamentUpdateInput } from '@/domains/data-provider-v2/contracts/tournament-update';
import { runTournamentUpdateOperation } from '@/domains/data-provider-v2/operations/tournament-update/tournament-operation-runner';
import { T_DataProviderExecutions } from '@/domains/data-provider/schema';
import type { TournamentRequestIn } from '@/domains/data-provider/typing';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { Request, Response } from 'express';

class AdminTournamentService {
  // Create tournament with admin context
  static async createTournament(req: TournamentRequestIn, res: Response) {
    const requestId = randomUUID();

    try {
      if (req.body.provider !== 'sofascore') {
        return res.status(422).json({
          success: false,
          error: `V2 tournament create only supports provider "${'sofascore'}"`,
        });
      }

      const tournamentInput: TournamentCreateInput = {
        tournamentPublicId: req.body.tournamentPublicId,
        baseUrl: req.body.baseUrl,
        publicUrl: req.body.publicUrl,
        slug: req.body.slug,
        provider: 'sofascore',
        season: req.body.season,
        mode: req.body.mode,
        label: req.body.label,
        standingsMode: req.body.standingsMode,
      };

      const operation = await runTournamentCreateOperation({
        requestId,
        tournament: tournamentInput,
      });

      if (operation.status !== 'completed') {
        return res.status(422).json({
          success: false,
          message: 'Tournament create operation failed',
          data: { tournament: operation.result },
        });
      }

      if (operation.result.outcome !== 'created') {
        throw new Error(
          `Tournament create operation completed without a created tournament for requestId=${requestId}`
        );
      }

      const tournament = operation.result.createdTournament;

      return res.status(201).json({
        success: true,
        data: { tournament },
        message: `Tournament "${tournament.label}" created successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        component: 'service',
        operation: 'create',
        resource: 'TOURNAMENTS',
        requestId,
        adminUser: req.authenticatedUser?.nickName,
      });
      return handleInternalServerErrorResponse(res, error);
    }
  }

  static async updateTournament(req: Request, res: Response) {
    const requestId = randomUUID();

    try {
      const { tournamentId } = req.params;

      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          message: 'Tournament ID is required',
        });
      }

      const previousTournament = await SERVICES_TOURNAMENT.getTournamentRecord(tournamentId);

      if (previousTournament.provider !== 'sofascore') {
        return res.status(422).json({
          success: false,
          error: `V2 tournament update only supports provider "${'sofascore'}"`,
        });
      }

      if (req.body.provider !== 'sofascore') {
        return res.status(422).json({
          success: false,
          error: `V2 tournament update only supports provider "${'sofascore'}"`,
        });
      }

      const tournamentInput: TournamentUpdateInput = {
        tournamentPublicId: req.body.tournamentPublicId,
        baseUrl: req.body.baseUrl,
        publicUrl: req.body.publicUrl,
        slug: req.body.slug,
        provider: 'sofascore',
        season: req.body.season,
        mode: req.body.mode,
        label: req.body.label,
        standingsMode: req.body.standingsMode,
      };

      const operation = await runTournamentUpdateOperation({
        requestId,
        tournamentId,
        previousTournament,
        tournament: tournamentInput,
      });

      if (operation.status !== 'completed') {
        return res.status(422).json({
          success: false,
          message: 'Tournament update operation failed',
          data: { tournament: operation.result },
        });
      }

      if (operation.result.outcome !== 'updated') {
        throw new Error(
          `Tournament update operation completed without an updated tournament for requestId=${requestId}`
        );
      }

      const tournament = operation.result.updatedTournament;

      return res.status(200).json({
        success: true,
        data: { tournament },
        message: `Tournament "${tournament.label}" updated successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        component: 'service',
        operation: 'update',
        resource: 'TOURNAMENTS',
        requestId,
        adminUser: req.authenticatedUser?.nickName,
      });

      if (error instanceof Error && error.message === 'Tournament not found') {
        return res.status(404).json({
          success: false,
          message: 'Tournament not found',
        });
      }

      return handleInternalServerErrorResponse(res, error);
    }
  }

  static async deleteTournament(req: Request, res: Response) {
    const requestId = randomUUID();

    try {
      const { tournamentId } = req.params;

      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          message: 'Tournament ID is required',
        });
      }

      const result = await SERVICES_TOURNAMENT.deleteTournament(tournamentId);

      if (result.outcome === 'not_found') {
        return res.status(404).json({
          success: false,
          message: 'Tournament not found',
        });
      }

      if (result.outcome === 'blocked') {
        const blockingResource =
          result.blocker === 'data_provider_execution' ? 'data provider execution' : 'scoreboard execution';

        return res.status(409).json({
          success: false,
          message: `Tournament "${result.tournament.label}" cannot be deleted while a ${blockingResource} is in progress`,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          tournament: {
            id: result.tournament.id,
            label: result.tournament.label,
          },
        },
        message: `Tournament "${result.tournament.label}" deleted successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        component: 'service',
        operation: 'delete',
        resource: 'TOURNAMENTS',
        requestId,
        adminUser: req.authenticatedUser?.nickName,
      });

      return handleInternalServerErrorResponse(res, error);
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
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        component: 'service',
        operation: 'getAllTournaments',
      });
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
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        component: 'service',
        operation: 'getTournamentById',
      });
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
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        component: 'service',
        operation: 'getTournamentExecutionJobs',
      });
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
