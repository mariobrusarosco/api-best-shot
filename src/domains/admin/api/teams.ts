import { AdminTeamsService } from '@/domains/admin/services/teams';
import { DataProviderReport } from '@/domains/data-provider/services/report';
import { TeamsDataProviderService } from '@/domains/data-provider/services/teams';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { Request, Response } from 'express';

export const API_ADMIN_TEAMS = {
  async createTeams(req: Request, res: Response) {
    // #1 Start Reporter
    const reporter = new DataProviderReport('create_teams');
    // #2 Start Provider
    const provider = await TeamsDataProviderService.create(reporter);

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

      // #7 Create Teams
      const teams = await provider.createTeams(tournament);

      return res.status(201).json({
        success: true,
        message: 'Teams created successfully',
        data: {
          teams,
          reportUrl: reporter.reportUrl,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create teams',
        error: (error as Error).message,
      });
    }
  },

  // Keep the old method for backwards compatibility during migration
  async createTeamsLegacy(req: Request, res: Response) {
    return await AdminTeamsService.createTeams(req, res);
  },
};
