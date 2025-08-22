import db from '@/services/database';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import {
  DB_InsertDataProviderExecution,
  DB_SelectDataProviderExecution,
  DB_UpdateDataProviderExecution,
  T_DataProviderExecutions,
} from '../schema';

export const QUERIES_DATA_PROVIDER_EXECUTIONS = {
  // Create a new execution record
  async createExecution(execution: DB_InsertDataProviderExecution): Promise<DB_SelectDataProviderExecution> {
    const [result] = await db.insert(T_DataProviderExecutions).values(execution).returning();
    return result;
  },

  // Update an existing execution record
  async updateExecution(
    id: string,
    updates: Partial<DB_UpdateDataProviderExecution>
  ): Promise<DB_SelectDataProviderExecution | null> {
    const [result] = await db
      .update(T_DataProviderExecutions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(T_DataProviderExecutions.id, id))
      .returning();
    return result || null;
  },

  // Update execution by request ID
  async updateExecutionByRequestId(
    requestId: string,
    updates: Partial<DB_UpdateDataProviderExecution>
  ): Promise<DB_SelectDataProviderExecution | null> {
    const [result] = await db
      .update(T_DataProviderExecutions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(T_DataProviderExecutions.requestId, requestId))
      .returning();
    return result || null;
  },

  // Get execution by ID
  async getExecutionById(id: string): Promise<DB_SelectDataProviderExecution | null> {
    const [result] = await db
      .select()
      .from(T_DataProviderExecutions)
      .where(eq(T_DataProviderExecutions.id, id))
      .limit(1);
    return result || null;
  },

  // Get execution by request ID
  async getExecutionByRequestId(requestId: string): Promise<DB_SelectDataProviderExecution | null> {
    const [result] = await db
      .select()
      .from(T_DataProviderExecutions)
      .where(eq(T_DataProviderExecutions.requestId, requestId))
      .limit(1);
    return result || null;
  },

  // Get all executions for a tournament
  async getExecutionsByTournament(
    tournamentId: string,
    options?: {
      operationType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<DB_SelectDataProviderExecution[]> {
    const conditions = [eq(T_DataProviderExecutions.tournamentId, tournamentId)];

    if (options?.operationType) {
      conditions.push(eq(T_DataProviderExecutions.operationType, options.operationType));
    }

    if (options?.status) {
      conditions.push(eq(T_DataProviderExecutions.status, options.status));
    }

    const baseQuery = db
      .select()
      .from(T_DataProviderExecutions)
      .where(and(...conditions))
      .orderBy(desc(T_DataProviderExecutions.startedAt));

    if (options?.limit && options?.offset) {
      return await baseQuery.limit(options.limit).offset(options.offset);
    } else if (options?.limit) {
      return await baseQuery.limit(options.limit);
    } else if (options?.offset) {
      return await baseQuery.offset(options.offset);
    }

    return await baseQuery;
  },

  // Get all executions with filtering
  async getAllExecutions(options?: {
    tournamentId?: string;
    operationType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<DB_SelectDataProviderExecution[]> {
    const conditions = [];

    if (options?.tournamentId) {
      conditions.push(eq(T_DataProviderExecutions.tournamentId, options.tournamentId));
    }

    if (options?.operationType) {
      conditions.push(eq(T_DataProviderExecutions.operationType, options.operationType));
    }

    if (options?.status) {
      conditions.push(eq(T_DataProviderExecutions.status, options.status));
    }

    if (options?.startDate) {
      conditions.push(gte(T_DataProviderExecutions.startedAt, options.startDate));
    }

    if (options?.endDate) {
      conditions.push(lte(T_DataProviderExecutions.startedAt, options.endDate));
    }

    const baseQuery =
      conditions.length > 0
        ? db
            .select()
            .from(T_DataProviderExecutions)
            .where(and(...conditions))
            .orderBy(desc(T_DataProviderExecutions.startedAt))
        : db.select().from(T_DataProviderExecutions).orderBy(desc(T_DataProviderExecutions.startedAt));

    if (options?.limit && options?.offset) {
      return await baseQuery.limit(options.limit).offset(options.offset);
    } else if (options?.limit) {
      return await baseQuery.limit(options.limit);
    } else if (options?.offset) {
      return await baseQuery.offset(options.offset);
    }

    return await baseQuery;
  },

  // Get execution count by status for a tournament
  async getExecutionCountsByStatus(tournamentId: string): Promise<Array<{ status: string; count: number }>> {
    // This would require raw SQL or a more complex query
    // For now, we'll implement a simple version
    const executions = await db
      .select()
      .from(T_DataProviderExecutions)
      .where(eq(T_DataProviderExecutions.tournamentId, tournamentId));

    const counts = executions.reduce(
      (acc, execution) => {
        acc[execution.status] = (acc[execution.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  },
};

export const QUERIES_DATA_PROVIDER = {
  executions: QUERIES_DATA_PROVIDER_EXECUTIONS,
};
