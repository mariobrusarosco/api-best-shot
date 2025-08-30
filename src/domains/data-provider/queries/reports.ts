import db from '@/services/database';
import { and, desc, eq } from 'drizzle-orm';
import {
  DB_InsertDataProviderReport,
  DB_SelectDataProviderReport,
  DB_UpdateDataProviderReport,
  T_DataProviderReports,
} from '../schema';

export const QUERIES_DATA_PROVIDER_REPORTS = {
  // Create a new report record
  async createReport(report: DB_InsertDataProviderReport): Promise<DB_SelectDataProviderReport> {
    const [result] = await db.insert(T_DataProviderReports).values(report).returning();
    return result;
  },

  // Update an existing report record
  async updateReport(
    id: string,
    updates: Partial<DB_UpdateDataProviderReport>
  ): Promise<DB_SelectDataProviderReport | null> {
    const [result] = await db
      .update(T_DataProviderReports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(T_DataProviderReports.id, id))
      .returning();
    return result || null;
  },

  // Update report by request ID
  async updateReportByRequestId(
    requestId: string,
    updates: Partial<DB_UpdateDataProviderReport>
  ): Promise<DB_SelectDataProviderReport | null> {
    const [result] = await db
      .update(T_DataProviderReports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(T_DataProviderReports.requestId, requestId))
      .returning();
    return result || null;
  },

  // Get report by request ID
  async getReportByRequestId(requestId: string): Promise<DB_SelectDataProviderReport | null> {
    const [result] = await db
      .select()
      .from(T_DataProviderReports)
      .where(eq(T_DataProviderReports.requestId, requestId))
      .limit(1);
    return result || null;
  },

  // Get all reports for a tournament
  async getReportsByTournament(
    tournamentId: string,
    options?: {
      operationType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<DB_SelectDataProviderReport[]> {
    const conditions = [eq(T_DataProviderReports.tournamentId, tournamentId)];

    if (options?.operationType) {
      conditions.push(eq(T_DataProviderReports.operationType, options.operationType));
    }

    if (options?.status) {
      conditions.push(eq(T_DataProviderReports.status, options.status));
    }

    const baseQuery = db
      .select()
      .from(T_DataProviderReports)
      .where(and(...conditions))
      .orderBy(desc(T_DataProviderReports.startedAt));

    if (options?.limit && options?.offset) {
      return await baseQuery.limit(options.limit).offset(options.offset);
    } else if (options?.limit) {
      return await baseQuery.limit(options.limit);
    }

    return await baseQuery;
  },
};