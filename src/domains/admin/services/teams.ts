import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { TeamsDataProviderService } from '@/domains/data-provider/services/teams';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import Profiling from '@/services/profiling';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

class AdminTeamsService {
  static async createTeams(req: Request, res: Response) {
    const requestId = randomUUID();
    let scraper: BaseScraper | null = null;

    try {
      if (!req.body.tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      Profiling.log({
        msg: `[ADMIN TEAMS CREATION] Request received`,
        data: {
          requestId,
          tournamentId: req.body.tournamentId,
          adminUser: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_TEAMS_create',
      });

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new TeamsDataProviderService(scraper, requestId);
      const teams = await dataProviderService.init(tournament);

      Profiling.log({
        msg: `[ADMIN TEAMS CREATION] Teams created successfully`,
        data: {
          requestId,
          tournamentId: tournament.id,
          teamsCount: teams.length,
          createdBy: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_TEAMS_create',
      });

      return res.status(201).json({
        success: true,
        data: { teams },
        message: `${teams.length} teams created successfully for tournament "${tournament.label}"`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_TEAMS_create',
        error,
        data: {
          requestId,
          operation: 'admin_teams_creation',
          adminUser: req.authenticatedUser?.nickName,
        },
      });
      return handleInternalServerErrorResponse(res, error);
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  }

  static async updateTeams(req: Request, res: Response) {
    const requestId = randomUUID();
    let scraper: BaseScraper | null = null;

    try {
      if (!req.body.tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      Profiling.log({
        msg: `[ADMIN] Updating teams for tournament ${tournament.label}..........`,
        data: {
          requestId,
          tournamentLabel: tournament.label,
          tournamentId: tournament.id,
          updatedBy: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_TEAMS_update',
      });

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new TeamsDataProviderService(scraper, requestId);
      const teams = await dataProviderService.init(tournament);

      Profiling.log({
        msg: `[ADMIN] Teams for tournament ${tournament.label} updated successfully!`,
        data: {
          requestId,
          tournamentId: tournament.id,
          teamsCount: teams.length,
          updatedBy: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_TEAMS_update',
      });

      return res.status(200).json({
        success: true,
        data: { teams },
        message: `${teams.length} teams updated successfully for tournament "${tournament.label}"`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_TEAMS_update',
        error,
        data: {
          requestId,
          operation: 'admin_teams_update',
          adminUser: req.authenticatedUser?.nickName,
        },
      });
      return handleInternalServerErrorResponse(res, error);
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  }
}

export { AdminTeamsService };
