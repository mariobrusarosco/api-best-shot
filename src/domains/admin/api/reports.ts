import { T_DataProviderReports } from '@/domains/data-provider/schema';
import { T_Tournament } from '@/domains/tournament/schema';
import db from '@/services/database';
import { desc, eq } from 'drizzle-orm';
import { Request, Response } from 'express';

export const API_ADMIN_REPORTS = {
  async getReports(req: Request, res: Response) {
    try {
      // Get limit from query params, default to 20
      const limit = parseInt(req.query.limit as string) || 20;
      const validLimit = Math.min(Math.max(1, limit), 100); // Limit between 1-100

      // Fetch recent data provider reports with tournament info
      const reports = await db
        .select({
          id: T_DataProviderReports.id,
          requestId: T_DataProviderReports.requestId,
          operationType: T_DataProviderReports.operationType,
          status: T_DataProviderReports.status,
          tournamentId: T_DataProviderReports.tournamentId,
          tournamentLabel: T_Tournament.label,
          summary: T_DataProviderReports.summary,
          reportUrl: T_DataProviderReports.reportFileUrl,
          reportKey: T_DataProviderReports.reportFileKey,
          duration: T_DataProviderReports.duration,
          startedAt: T_DataProviderReports.startedAt,
          completedAt: T_DataProviderReports.completedAt,
          createdAt: T_DataProviderReports.createdAt,
          updatedAt: T_DataProviderReports.updatedAt,
        })
        .from(T_DataProviderReports)
        .leftJoin(T_Tournament, eq(T_DataProviderReports.tournamentId, T_Tournament.id))
        .orderBy(desc(T_DataProviderReports.startedAt))
        .limit(validLimit);

      // Transform the data
      const formattedReports = reports.map(report => {
        const summary = (report.summary as Record<string, unknown>) || {};
        return {
          id: report.id,
          requestId: report.requestId,
          operationType: report.operationType,
          status: report.status,
          tournament: {
            id: report.tournamentId,
            label: report.tournamentLabel || 'Unknown Tournament',
          },
          summary: {
            totalOperations: summary.totalOperations || 0,
            successfulOperations: summary.successfulOperations || 0,
            failedOperations: summary.failedOperations || 0,
          },
          reportUrl: report.reportUrl,
          reportKey: report.reportKey,
          duration: report.duration,
          startedAt: report.startedAt,
          completedAt: report.completedAt,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        };
      });

      return res.status(200).json({
        success: true,
        data: formattedReports,
        total: formattedReports.length,
        limit: validLimit,
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch reports',
        error: (error as Error).message,
      });
    }
  },
};
