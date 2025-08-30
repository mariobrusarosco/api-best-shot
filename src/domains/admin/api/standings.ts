import { DataProviderReport } from '@/domains/data-provider/services/reporter';
import { StandingsDataProviderService } from '@/domains/data-provider/services/standings';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { Request, Response } from 'express';

export const API_ADMIN_STANDINGS = {
  async createStandings(req: Request, res: Response) {
    // #1 Start Reporter
    const reporter = new DataProviderReport('create_standings');
    // #2 Start Provider
    const provider = await StandingsDataProviderService.create(reporter);

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
      provider.report.setTournament(tournament);
      // #7 Create Standings
      const standings = await provider.createStandings(tournament);
      console.log({ standings, reporter: provider.report.toJSON() });

      return res.status(200).json({
        success: true,
        message: 'Standings created successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create standings',
        error: (error as Error).message,
      });
    }
  },

  async updateStandings(req: Request, res: Response) {
    // #1 Start Reporter
    const reporter = new DataProviderReport('update_standings');
    // #2 Start Provider
    const provider = await StandingsDataProviderService.create(reporter);

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
      provider.report.setTournament(tournament);
      // #7 Create Standings
      await provider.updateStandings(tournament);

      return res.status(200).json({
        success: true,
        message: 'Standings created successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create standings',
        error: (error as Error).message,
      });
    }
  },
};
