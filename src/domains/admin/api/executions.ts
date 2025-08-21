// Admin API endpoints for execution management
import { Request, Response } from 'express';
import { DataProviderExecutionService } from '@/domains/data-provider/services';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';

interface ExecutionsQuery {
  tournamentId?: string;
  operationType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
  offset?: string;
}

export const API_ADMIN_EXECUTIONS = {
  // GET /api/v1/admin/executions - List all executions with filtering
  async getAllExecutions(
    req: Request<
      Record<string, never>,
      Record<string, never>,
      Record<string, never>,
      ExecutionsQuery
    >,
    res: Response
  ) {
    try {
      const {
        tournamentId,
        operationType,
        status,
        startDate,
        endDate,
        limit = '50',
        offset = '0',
      } = req.query;

      const options = {
        tournamentId,
        operationType,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      };

      const executions = await DataProviderExecutionService.getAllExecutions(options);

      return res.status(200).json({
        success: true,
        data: executions,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: executions.length,
        },
      });
    } catch (error) {
      console.error('Error fetching executions:', error);
      return handleInternalServerErrorResponse(res, error);
    }
  },

  // GET /api/v1/admin/executions/tournament/:tournamentId - Get executions for specific tournament
  async getExecutionsByTournament(req: Request, res: Response) {
    try {
      const { tournamentId } = req.params;
      const {
        operationType,
        status,
        limit = '50',
        offset = '0',
      } = req.query as ExecutionsQuery;

      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      // Verify tournament exists
      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      const options = {
        operationType,
        status,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      };

      const executions = await DataProviderExecutionService.getExecutionsByTournament(
        tournamentId,
        options
      );

      const stats = await DataProviderExecutionService.getExecutionStats(tournamentId);

      // Group executions by operation type for frontend display
      const groupedExecutions = executions.reduce(
        (acc, execution) => {
          const operationType = execution.operationType;
          if (!acc[operationType]) {
            acc[operationType] = [];
          }
          acc[operationType].push({
            id: execution.id,
            requestId: execution.requestId,
            ranAt: execution.startedAt,
            completedAt: execution.completedAt,
            status: execution.status,
            duration: execution.duration,
            summary: execution.summary,
            reportFileUrl: execution.reportFileUrl,
          });
          return acc;
        },
        {} as Record<string, unknown[]>
      );

      return res.status(200).json({
        success: true,
        data: {
          tournament: {
            id: tournament.id,
            label: tournament.label,
            executions: groupedExecutions,
          },
          stats,
        },
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: executions.length,
        },
      });
    } catch (error) {
      console.error('Error fetching tournament executions:', error);
      return handleInternalServerErrorResponse(res, error);
    }
  },

  // GET /api/v1/admin/executions/:id - Get specific execution details
  async getExecutionById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Execution ID is required',
        });
      }

      const execution = await DataProviderExecutionService.getExecutionById(id);

      if (!execution) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found',
        });
      }

      // Get tournament details
      const tournament = await SERVICES_TOURNAMENT.getTournament(execution.tournamentId);

      return res.status(200).json({
        success: true,
        data: {
          execution,
          tournament: tournament
            ? {
                id: tournament.id,
                label: tournament.label,
              }
            : null,
        },
      });
    } catch (error) {
      console.error('Error fetching execution details:', error);
      return handleInternalServerErrorResponse(res, error);
    }
  },

  // GET /api/v1/admin/executions/:id/report - Fetch detailed operation report
  async getExecutionReport(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Execution ID is required',
        });
      }

      const execution = await DataProviderExecutionService.getExecutionById(id);

      if (!execution) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found',
        });
      }

      if (!execution.reportFileUrl) {
        return res.status(404).json({
          success: false,
          error: 'Operation report not available for this execution',
        });
      }

      // In a real implementation, you would fetch the report from S3
      // For now, we'll return the report file URL
      return res.status(200).json({
        success: true,
        data: {
          executionId: execution.id,
          reportFileUrl: execution.reportFileUrl,
          reportFileKey: execution.reportFileKey,
          message: 'Use the reportFileUrl to download the detailed operation report',
        },
      });
    } catch (error) {
      console.error('Error fetching execution report:', error);
      return handleInternalServerErrorResponse(res, error);
    }
  },

  // GET /api/v1/admin/executions/stats - Get execution statistics
  async getExecutionStats(req: Request, res: Response) {
    try {
      const { tournamentId } = req.query as { tournamentId?: string };

      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      const stats = await DataProviderExecutionService.getExecutionStats(tournamentId);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching execution stats:', error);
      return handleInternalServerErrorResponse(res, error);
    }
  },
};
