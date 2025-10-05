import { MatchesDataProviderService } from '@/domains/data-provider/services/match';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { Request, Response } from 'express';

export const API_ADMIN_MATCHES = {
  async createMatches(req: Request, res: Response) {
    let scraper: BaseScraper | null = null;
    try {
      // #1 Create scraper and provider
      scraper = await BaseScraper.createInstance();
      const provider = new MatchesDataProviderService(scraper, 'admin-create-matches');
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

      // #6 Get Tournament Rounds
      const rounds = await QUERIES_TOURNAMENT_ROUND.getAllRounds(tournament.id);
      if (!rounds || rounds.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No tournament rounds found',
        });
      }

      // #7 Create Matches
      const matches = await provider.init(rounds, tournament);

      return res.status(201).json({
        success: true,
        message: 'Tournament matches created successfully',
        data: {
          matches,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create tournament matches',
        error: (error as Error).message,
      });
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  },

  async updateMatches(req: Request, res: Response) {
    let scraper: BaseScraper | null = null;
    try {
      // #1 Create scraper and provider
      scraper = await BaseScraper.createInstance();
      const provider = new MatchesDataProviderService(scraper, 'admin-update-matches');
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

      // #6 Get Tournament Rounds
      const rounds = await QUERIES_TOURNAMENT_ROUND.getAllRounds(tournament.id);
      if (!rounds || rounds.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No tournament rounds found',
        });
      }

      // #7 Update Matches
      const result = await provider.updateRound(rounds[0]); // Note: updateRound takes single round

      return res.status(200).json({
        success: true,
        message: 'Tournament matches updated successfully',
        data: {
          result,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update tournament matches',
        error: (error as Error).message,
      });
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  },
};
