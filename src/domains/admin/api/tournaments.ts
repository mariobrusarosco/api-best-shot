import { AdminRoundsService } from '@/domains/admin/services/rounds';
import { AdminTournamentService } from '@/domains/admin/services/tournament';
import { Request, Response } from 'express';

export const API_ADMIN_TOURNAMENTS = {
  async getAllTournaments(req: Request, res: Response) {
    return await AdminTournamentService.getAllTournaments(req, res);
  },

  async createTournament(req: Request, res: Response) {
    return await AdminTournamentService.createTournament(req, res);
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
