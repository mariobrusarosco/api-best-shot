import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type { RoundsTournamentContext } from '@/domains/data-provider-v2/contracts/rounds';
import { runTournamentRoundsCreateOperation } from '@/domains/data-provider-v2/operations/rounds-create/tournament-operation-runner';
import { runTournamentRoundsUpdateOperation } from '@/domains/data-provider-v2/operations/rounds-update/tournament-operation-runner';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

class AdminRoundsService {
  static async createRounds(req: Request, res: Response) {
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
          error: `V2 rounds create only supports provider "${'sofascore'}"`,
        });
      }

      const tournamentContext: RoundsTournamentContext = {
        tournamentId: tournamentId,
        tournamentLabel: tournament.label,
        baseUrl: tournament.baseUrl,
        provider: 'sofascore',
      };

      const operation = await runTournamentRoundsCreateOperation({
        requestId,
        tournament: tournamentContext,
      });

      if (operation.status !== 'completed') {
        return res.status(422).json({
          success: false,
          message: 'Rounds create operation failed',
          data: { rounds: operation.result },
        });
      }

      return res.status(201).json({
        success: true,
        data: { rounds: operation.result },
        message: `Rounds created successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        operation: 'createRounds',
        component: 'service',
        requestId,
        adminUser: req.authenticatedUser?.nickName,
      });
      return handleInternalServerErrorResponse(res, error);
    }
  }

  static async updateRounds(req: Request, res: Response) {
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
          error: `V2 rounds update only supports provider "${'sofascore'}"`,
        });
      }

      const tournamentContext: RoundsTournamentContext = {
        tournamentId: tournamentId,
        tournamentLabel: tournament.label,
        baseUrl: tournament.baseUrl,
        provider: 'sofascore',
      };

      const operation = await runTournamentRoundsUpdateOperation({
        requestId,
        tournament: tournamentContext,
      });

      if (operation.status !== 'completed') {
        return res.status(422).json({
          success: false,
          message: 'Rounds update operation failed',
          data: { rounds: operation.result },
        });
      }

      return res.status(200).json({
        success: true,
        data: { rounds: operation.result },
        message: `Rounds updated successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        operation: 'updateRounds',
        component: 'service',
        requestId,
        adminUser: req.authenticatedUser?.nickName,
      });
      return handleInternalServerErrorResponse(res, error);
    }
  }
}

export { AdminRoundsService };
