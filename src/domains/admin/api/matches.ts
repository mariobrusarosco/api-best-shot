import { DataProviderReport } from '@/domains/data-provider/services/reporter';
import { MatchesDataProviderService } from '@/domains/data-provider/services/match';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { Request, Response } from 'express';

export const API_ADMIN_MATCHES = {
  async createMatches(req: Request, res: Response) {
    // #1 Start Reporter
    const reporter = new DataProviderReport('create_matches');
    // #2 Start Provider
    const provider = await MatchesDataProviderService.create(reporter);

    try {
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
      const matches = await provider.createMatches(rounds, tournament);

      return res.status(201).json({
        success: true,
        message: 'Tournament matches created successfully',
        data: {
          matches,
          reportUrl: reporter.reportUrl,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create tournament matches',
        error: (error as Error).message,
      });
    }
  },

  async updateMatches(req: Request, res: Response) {
    // #1 Start Reporter
    const reporter = new DataProviderReport('update_matches');
    // #2 Start Provider
    const provider = await MatchesDataProviderService.create(reporter);

    try {
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
      const result = await provider.updateMatches(rounds, tournament);

      return res.status(200).json({
        success: true,
        message: 'Tournament matches updated successfully',
        data: {
          result,
          reportUrl: reporter.reportUrl,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update tournament matches',
        error: (error as Error).message,
      });
    }
  },
};
