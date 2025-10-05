import { T_DataProviderExecutions } from '@/domains/data-provider/schema';
import { T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { desc, eq } from 'drizzle-orm';
import { Request, Response } from 'express';

export const API_ADMIN_EXECUTION_JOBS = {
  async getExecutionJobs(req: Request, res: Response) {
    try {
      // Get limit from query params, default to 10
      const limit = parseInt(req.query.limit as string) || 10;
      const validLimit = Math.min(Math.max(1, limit), 100); // Limit between 1-100

      // Fetch recent data provider executions with tournament info
      const executionJobs = await db
        .select({
          id: T_DataProviderExecutions.id,
          operationType: T_DataProviderExecutions.operationType,
          status: T_DataProviderExecutions.status,
          tournamentId: T_DataProviderExecutions.tournamentId,
          tournamentLabel: T_Tournament.label,
          summary: T_DataProviderExecutions.summary,
          reportUrl: T_DataProviderExecutions.reportFileUrl,
          createdAt: T_DataProviderExecutions.startedAt,
          endTime: T_DataProviderExecutions.completedAt,
        })
        .from(T_DataProviderExecutions)
        .leftJoin(T_Tournament, eq(T_DataProviderExecutions.tournamentId, T_Tournament.id))
        .orderBy(desc(T_DataProviderExecutions.startedAt))
        .limit(validLimit);

      // Transform the data to match what the frontend expects
      const formattedJobs = executionJobs.map(job => {
        const summary = (job.summary as Record<string, unknown>) || {};
        return {
          id: job.id,
          operationType: job.operationType,
          status: job.status,
          tournament: {
            id: job.tournamentId,
            label: job.tournamentLabel || 'Unknown Tournament',
          },
          summary: {
            totalOperations: summary.totalOperations || 0,
            successfulOperations: summary.successfulOperations || 0,
            failedOperations: summary.failedOperations || 0,
          },
          reportUrl: job.reportUrl,
          createdAt: job.createdAt,
          endTime: job.endTime,
          duration:
            job.endTime && job.createdAt
              ? Math.round((new Date(job.endTime).getTime() - new Date(job.createdAt).getTime()) / 1000)
              : null,
        };
      });

      return res.status(200).json({
        success: true,
        data: formattedJobs,
        total: formattedJobs.length,
        limit: validLimit,
      });
    } catch (error) {
      console.error('Error fetching execution jobs:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch execution jobs',
        error: (error as Error).message,
      });
    }
  },
};
