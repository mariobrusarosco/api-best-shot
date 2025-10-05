import { StandingsDataProviderService } from '@/domains/data-provider/services/standings';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { Request, Response } from 'express';

export const API_ADMIN_STANDINGS = {
  async createStandings(req: Request, res: Response) {
    let scraper: BaseScraper | null = null;
    try {
      // #1 Create scraper and provider
      scraper = await BaseScraper.createInstance();
      const provider = new StandingsDataProviderService(scraper, 'admin-create-standings');

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

      // #5 Create Standings
      const standings = await provider.init({
        tournamentId: tournament.id,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      });

      return res.status(200).json({
        success: true,
        message: 'Standings created successfully',
        data: { standings },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create standings',
        error: (error as Error).message,
      });
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  },

  async updateStandings(req: Request, res: Response) {
    let scraper: BaseScraper | null = null;
    try {
      // #1 Create scraper and provider
      scraper = await BaseScraper.createInstance();
      const provider = new StandingsDataProviderService(scraper, 'admin-update-standings');

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

      // #5 Update Standings
      const standings = await provider.update({
        tournamentId: tournament.id,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      });

      return res.status(200).json({
        success: true,
        message: 'Standings updated successfully',
        data: { standings },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update standings',
        error: (error as Error).message,
      });
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  },
};
