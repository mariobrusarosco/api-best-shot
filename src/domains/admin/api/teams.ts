import { AdminTeamsService } from '@/domains/admin/services/teams';
import { TeamsDataProviderService } from '@/domains/data-provider/services/teams';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { Request, Response } from 'express';

export const API_ADMIN_TEAMS = {
  async createTeams(req: Request, res: Response) {
    let scraper: BaseScraper | null = null;
    try {
      // #1 Create scraper and provider
      scraper = await BaseScraper.createInstance();
      const provider = new TeamsDataProviderService(scraper, 'admin-create-teams');

      // #2 Validate Input
      if (!req.body.tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      // #3 Get Tournament
      const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
      // #4 Validate Tournament
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      // #5 Create Teams
      const teams = await provider.init({
        tournamentId: tournament.id,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      });

      return res.status(201).json({
        success: true,
        message: 'Teams created successfully',
        data: { teams },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create teams',
        error: (error as Error).message,
      });
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  },

  // Keep the old method for backwards compatibility during migration
  async createTeamsLegacy(req: Request, res: Response) {
    return await AdminTeamsService.createTeams(req, res);
  },
};
