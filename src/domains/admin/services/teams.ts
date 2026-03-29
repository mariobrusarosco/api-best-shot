import type { TeamsTournamentContext } from '@/domains/data-provider-v2/contracts/teams';
import { runTournamentTeamsCreateOperation } from '@/domains/data-provider-v2/operations/teams-create/tournament-operation-runner';
import { runTournamentTeamsUpdateOperation } from '@/domains/data-provider-v2/operations/teams-update/tournament-operation-runner';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

class AdminTeamsService {
  static async createTeams(req: Request, res: Response) {
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
          error: `V2 teams create only supports provider "${'sofascore'}"`,
        });
      }

      const tournamentContext: TeamsTournamentContext = {
        tournamentId,
        tournamentLabel: tournament.label,
        baseUrl: tournament.baseUrl,
        provider: 'sofascore',
        mode: tournament.mode,
      };

      const operation = await runTournamentTeamsCreateOperation({
        requestId,
        tournament: tournamentContext,
      });

      if (operation.status !== 'completed') {
        return res.status(422).json({
          success: false,
          message: 'Teams create operation failed',
          data: { teams: operation.result },
        });
      }

      return res.status(201).json({
        success: true,
        data: { teams: operation.result },
        message: `Teams created successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        component: 'service',
        operation: 'create',
        resource: 'TEAMS',
        requestId,
        adminUser: req.authenticatedUser?.nickName,
      });
      return handleInternalServerErrorResponse(res, error);
    }
  }

  static async updateTeams(req: Request, res: Response) {
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
          error: `V2 teams update only supports provider "${'sofascore'}"`,
        });
      }

      const tournamentContext: TeamsTournamentContext = {
        tournamentId,
        tournamentLabel: tournament.label,
        baseUrl: tournament.baseUrl,
        provider: 'sofascore',
        mode: tournament.mode,
      };

      const operation = await runTournamentTeamsUpdateOperation({
        requestId,
        tournament: tournamentContext,
      });

      if (operation.status !== 'completed') {
        return res.status(422).json({
          success: false,
          message: 'Teams update operation failed',
          data: { teams: operation.result },
        });
      }

      return res.status(200).json({
        success: true,
        data: { teams: operation.result },
        message: `Teams updated successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        component: 'service',
        operation: 'update',
        resource: 'TEAMS',
        requestId,
        adminUser: req.authenticatedUser?.nickName,
      });
      return handleInternalServerErrorResponse(res, error);
    }
  }
}

export { AdminTeamsService };
