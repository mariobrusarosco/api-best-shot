import { AdminRoundsService } from '@/domains/admin/services/rounds';
import { AdminStandingsService } from '@/domains/admin/services/standings';
import { AdminTeamsService } from '@/domains/admin/services/teams';
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

  async updateRounds(req: Request, res: Response) {
    return await AdminRoundsService.updateRounds(req, res);
  },

  async createTeams(req: Request, res: Response) {
    return await AdminTeamsService.createTeams(req, res);
  },

  async updateTeams(req: Request, res: Response) {
    return await AdminTeamsService.updateTeams(req, res);
  },

  async createStandings(req: Request, res: Response) {
    return await AdminStandingsService.createStandings(req, res);
  },
};
