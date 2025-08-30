import { T_DataProviderReports } from '@/domains/data-provider/schema';
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

      // Fetch recent data provider reports (execution jobs) with tournament info
      const executionJobs = await db
        .select({
          id: T_DataProviderReports.id,
          operationType: T_DataProviderReports.operationType,
          status: T_DataProviderReports.status,
          tournamentId: T_DataProviderReports.tournamentId,
          tournamentLabel: T_Tournament.label,
          summary: T_DataProviderReports.summary,
          reportUrl: T_DataProviderReports.reportFileUrl,
          createdAt: T_DataProviderReports.startedAt,
          endTime: T_DataProviderReports.completedAt,
        })
        .from(T_DataProviderReports)
        .leftJoin(T_Tournament, eq(T_DataProviderReports.tournamentId, T_Tournament.id))
        .orderBy(desc(T_DataProviderReports.startedAt))
        .limit(validLimit);

      // Transform the data to match what the frontend expects
      const formattedJobs = executionJobs.map(job => {
        const summary = (job.summary as any) || {};
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
