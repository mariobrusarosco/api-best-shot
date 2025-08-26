import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { randomUUID } from 'crypto';
import { CreateTournamentInput } from '../api/v2/tournament/typing';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { QUERIES_DATA_PROVIDER_EXECUTIONS } from '../queries';
import type { DB_InsertDataProviderExecution, DB_SelectDataProviderExecution } from '../schema';
import { MatchesDataProviderService } from './match';
import { RoundDataProviderService } from './rounds';
import { StandingsDataProviderService } from './standings';
import { TeamsDataProviderService } from './teams';
import { TournamentDataProviderService } from './tournaments';

export class DataProviderExecutionService {
  // Create a new execution record
  static async createExecution(data: {
    requestId: string;
    tournamentId: string;
    operationType: string;
  }): Promise<DB_SelectDataProviderExecution> {
    const execution: DB_InsertDataProviderExecution = {
      requestId: data.requestId,
      tournamentId: data.tournamentId,
      operationType: data.operationType,
      status: 'in_progress',
      startedAt: new Date(),
    };

    return await QUERIES_DATA_PROVIDER_EXECUTIONS.createExecution(execution);
  }

  // Update execution with completion data
  static async completeExecution(
    requestId: string,
    data: {
      status: 'completed' | 'failed';
      reportFileUrl?: string;
      reportFileKey?: string;
      summary?: Record<string, unknown>;
      duration?: number;
    }
  ): Promise<DB_SelectDataProviderExecution | null> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.updateExecutionByRequestId(requestId, {
      status: data.status,
      completedAt: new Date(),
      reportFileUrl: data.reportFileUrl,
      reportFileKey: data.reportFileKey,
      summary: data.summary,
      duration: data.duration,
    });
  }

  // Update execution with specific fields (like tournament ID)
  static async updateExecution(
    requestId: string,
    data: {
      tournamentId?: string;
      status?: 'completed' | 'failed' | 'in_progress';
      reportFileUrl?: string;
      reportFileKey?: string;
      summary?: Record<string, unknown>;
    }
  ): Promise<DB_SelectDataProviderExecution | null> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.updateExecutionByRequestId(requestId, data);
  }

  // Get executions by tournament
  static async getExecutionsByTournament(
    tournamentId: string,
    options?: {
      operationType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<DB_SelectDataProviderExecution[]> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.getExecutionsByTournament(tournamentId, options);
  }

  // Get all executions with filtering
  static async getAllExecutions(options?: {
    tournamentId?: string;
    operationType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<DB_SelectDataProviderExecution[]> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.getAllExecutions(options);
  }

  // Get execution by ID
  static async getExecutionById(id: string): Promise<DB_SelectDataProviderExecution | null> {
    return await QUERIES_DATA_PROVIDER_EXECUTIONS.getExecutionById(id);
  }

  // Get execution statistics for a tournament
  static async getExecutionStats(tournamentId: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    in_progress: number;
    byOperationType: Record<string, { total: number; completed: number; failed: number }>;
  }> {
    const executions = await QUERIES_DATA_PROVIDER_EXECUTIONS.getExecutionsByTournament(tournamentId);

    const stats = {
      total: executions.length,
      completed: 0,
      failed: 0,
      in_progress: 0,
      byOperationType: {} as Record<string, { total: number; completed: number; failed: number }>,
    };

    executions.forEach(execution => {
      if (execution.status === 'completed') stats.completed++;
      else if (execution.status === 'failed') stats.failed++;
      else if (execution.status === 'in_progress') stats.in_progress++;

      if (!stats.byOperationType[execution.operationType]) {
        stats.byOperationType[execution.operationType] = {
          total: 0,
          completed: 0,
          failed: 0,
        };
      }

      stats.byOperationType[execution.operationType].total++;
      if (execution.status === 'completed') {
        stats.byOperationType[execution.operationType].completed++;
      } else if (execution.status === 'failed') {
        stats.byOperationType[execution.operationType].failed++;
      }
    });

    return stats;
  }
}
export class SofaScoreScraper extends BaseScraper {
  public async createTournament(payload: CreateTournamentInput) {
    try {
      const scraper = await BaseScraper.createInstance();
      const requestId = randomUUID();
      console.log('TOURNAMENT CREATION - [START]', payload);

      const tournamentService = new TournamentDataProviderService(scraper, requestId);
      const standingsService = new StandingsDataProviderService(scraper, requestId);
      const roundService = new RoundDataProviderService(scraper, requestId);
      const teamsService = new TeamsDataProviderService(scraper, requestId);
      const matchesService = new MatchesDataProviderService(scraper, requestId);

      //Step 1: Tournament Service
      const { id: tournamentId } = await tournamentService.init(payload);
      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
      //Step 2: Round Service
      const rounds = await roundService.init(tournament.id, tournament.baseUrl);
      //Step 3: Standings Service
      const standings = await standingsService.init(tournament);
      //Step 4: Teams Service
      const tournamentTemp = await SERVICES_TOURNAMENT.getTournament(tournament.id);
      const teams = await teamsService.init(tournamentTemp);
      //Step 5: Matches Service
      const matches = await matchesService.init(rounds, tournament);

      return {
        tournament,
        rounds,
        standings,
        teams,
        matches,
      };
    } catch (error) {
      console.error('TOURNAMENT CREATION - [ERROR]', error);
      throw error;
    }
  }

  public async create(payload: CreateTournamentInput) {
    return this.createTournament(payload);
  }
}
