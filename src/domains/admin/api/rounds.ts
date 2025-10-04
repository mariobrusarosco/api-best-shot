import { DataProviderReport } from '@/domains/data-provider/services/report';
import { RoundDataProviderService } from '@/domains/data-provider/services/rounds';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { Request, Response } from 'express';

export const API_ADMIN_ROUNDS = {
  async createRounds(req: Request, res: Response) {
    // #1 Start Reporter
    const reporter = new DataProviderReport('create_rounds');
    // #2 Start Provider
    const provider = await RoundDataProviderService.create(reporter);

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

      // #6 Set Tournament on Reporter
      provider.report.setTournament({
        label: tournament.label,
        id: tournament.id,
        provider: 'sofascore',
      });

      // #7 Create Rounds
      const rounds = await provider.createRounds(tournament);

      return res.status(201).json({
        success: true,
        message: 'Tournament rounds created successfully',
        data: {
          rounds,
          reportUrl: reporter.reportUrl,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create tournament rounds',
        error: (error as Error).message,
      });
    }
  },

  async updateRounds(req: Request, res: Response) {
    // #1 Start Reporter
    const reporter = new DataProviderReport('update_rounds');
    // #2 Start Provider
    const provider = await RoundDataProviderService.create(reporter);

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

      // #6 Set Tournament on Reporter
      provider.report.setTournament({
        label: tournament.label,
        id: tournament.id,
        provider: 'sofascore',
      });

      // #7 Update Rounds
      const result = await provider.updateRounds(tournament);

      return res.status(200).json({
        success: true,
        message: 'Tournament rounds updated successfully',
        data: {
          result,
          reportUrl: reporter.reportUrl,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update tournament rounds',
        error: (error as Error).message,
      });
    }
  },
};
