import { AdminRoundsService } from '@/domains/admin/services/rounds';
import { AdminTournamentService } from '@/domains/admin/services/tournament';
import { DataProviderReport } from '@/domains/data-provider/services/reporter';
import { TournamentDataProviderService } from '@/domains/data-provider/services/tournaments';
import { Request, Response } from 'express';

export const API_ADMIN_TOURNAMENTS = {
  async getAllTournaments(req: Request, res: Response) {
    return await AdminTournamentService.getAllTournaments(req, res);
  },

  async createTournament(req: Request, res: Response) {
    // #1 Start Reporter
    const reporter = new DataProviderReport('create_tournament');
    // #2 Start Provider
    const provider = await TournamentDataProviderService.create(reporter);

    try {
      // #3 Validate Input
      if (!req.body.tournamentPublicId || !req.body.label) {
        return res.status(400).json({
          success: false,
          error: 'Tournament public ID and label are required',
        });
      }

      // #4 Create Tournament
      await provider.createTournament(req.body);

      return res.status(201).json({
        success: true,
        message: 'Tournament created successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create tournament',
        error: (error as Error).message,
      });
    }
  },

  async createRounds(req: Request, res: Response) {
    return await AdminRoundsService.createRounds(req, res);
  },

  async updateRounds(_req: Request, res: Response) {
    return res.status(501).json({
      success: false,
      message: 'Update rounds functionality not yet implemented',
    });
  },
};
