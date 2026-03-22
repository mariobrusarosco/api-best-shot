import type { StandingsCreateTournamentContext } from '@/domains/data-provider-v2/contracts/standings';
import { runTournamentStandingsCreateOperation } from '@/domains/data-provider-v2/operations/standings-create/tournament-operation-runner';
import { runStandingsUpdateBatch } from '@/domains/data-provider-v2/use-cases/standings/run-standings-update-batch';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

class AdminStandingsService {
  static async createStandings(req: Request, res: Response) {
    const requestId = randomUUID();

    try {
      const tournamentId = req.params.tournamentId;
      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      const tournament = await SERVICES_TOURNAMENT.getTournamentDetails(tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      if (tournament.provider !== 'sofascore') {
        return res.status(422).json({
          success: false,
          error: `V2 standings create only supports provider "${'sofascore'}"`,
        });
      }

      const tournamentContext: StandingsCreateTournamentContext = {
        tournamentId: tournamentId,
        baseUrl: tournament.baseUrl,
        tournamentLabel: tournament.label,
        provider: 'sofascore',
        mode: tournament.mode,
        standingsMode: tournament.standingsMode,
      };

      const operation = await runTournamentStandingsCreateOperation({
        requestId,
        tournament: tournamentContext,
      });

      if (operation.status !== 'completed') {
        return res.status(422).json({
          success: false,
          message: 'Standings create operation failed',
          data: { standings: operation.result },
        });
      }

      return res.status(201).json({
        success: true,
        data: { standings: operation.result },
        message: `Standings created successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        component: 'service',
        operation: 'create',
        resource: 'STANDINGS',
        requestId,
        adminUser: req.authenticatedUser?.nickName,
      });
      return handleInternalServerErrorResponse(res, error);
    }
  }

  static async updateStandings(req: Request, res: Response) {
    const requestId = randomUUID();

    try {
      const tournamentId = req.params.tournamentId;
      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      const tournament = await SERVICES_TOURNAMENT.getTournamentDetails(tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      if (tournament.provider !== 'sofascore') {
        return res.status(422).json({
          success: false,
          error: `V2 standings update only supports provider "${'sofascore'}"`,
        });
      }

      const batch = await runStandingsUpdateBatch({
        tournamentIds: [tournamentId],
      });

      const operation = batch.results[0];

      if (!operation) {
        throw new Error(`Standings update batch did not return a result for tournament "${tournamentId}"`);
      }

      if (operation.status !== 'completed') {
        return res.status(422).json({
          success: false,
          message: 'Standings update operation failed',
          data: { standings: operation.result },
        });
      }

      return res.status(200).json({
        success: true,
        data: { standings: operation.result },
        message: `Standings updated successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        component: 'service',
        operation: 'update',
        resource: 'STANDINGS',
        requestId,
        adminUser: req.authenticatedUser?.nickName,
      });
      return handleInternalServerErrorResponse(res, error);
    }
  }
}

export { AdminStandingsService };
