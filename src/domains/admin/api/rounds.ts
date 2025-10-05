import { RoundsDataProviderService } from '@/domains/data-provider/services/rounds';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { Request, Response } from 'express';

export const API_ADMIN_ROUNDS = {
  async createRounds(req: Request, res: Response) {
    let scraper: BaseScraper | null = null;
    try {
      // #1 Create scraper and provider
      scraper = await BaseScraper.createInstance();
      const provider = new RoundsDataProviderService(scraper, 'admin-create-rounds');
      // #3 Validate Input
      if (!req.body.tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      // #4 Get Tournament
      const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
      // #5 Validate Tournament
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      // #6 Create Rounds
      const rounds = await provider.init({
        tournamentId: tournament.id,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      });

      return res.status(201).json({
        success: true,
        message: 'Tournament rounds created successfully',
        data: {
          rounds,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create tournament rounds',
        error: (error as Error).message,
      });
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  },

  async updateRounds(req: Request, res: Response) {
    let scraper: BaseScraper | null = null;
    try {
      // #1 Create scraper and provider
      scraper = await BaseScraper.createInstance();
      const provider = new RoundsDataProviderService(scraper, 'admin-update-rounds');
      // #3 Validate Input
      if (!req.body.tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      // #4 Get Tournament
      const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
      // #5 Validate Tournament
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      // #6 Update Rounds
      const result = await provider.update({
        tournamentId: tournament.id,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      });

      return res.status(200).json({
        success: true,
        message: 'Tournament rounds updated successfully',
        data: {
          result,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update tournament rounds',
        error: (error as Error).message,
      });
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  },
};
