import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchesDataProviderService } from '@/domains/data-provider/services/match';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import Profiling from '@/services/profiling';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

class AdminMatchesService {
  static async createMatches(req: Request, res: Response) {
    const requestId = randomUUID();
    let scraper: BaseScraper | null = null;

    try {
      if (!req.body.tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      // Get tournament rounds - matches need rounds to be created first
      const rounds = await QUERIES_TOURNAMENT_ROUND.getAllRounds(tournament.id);
      if (rounds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Tournament rounds not found. Please create rounds first.',
        });
      }

      Profiling.log({
        msg: `[ADMIN] Creating matches for tournament ${tournament.label}..........`,
        data: {
          requestId,
          tournamentLabel: tournament.label,
          tournamentId: tournament.id,
          roundsCount: rounds.length,
          createdBy: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_MATCHES_create',
      });

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new MatchesDataProviderService(scraper, requestId);
      const matches = await dataProviderService.init(rounds, tournament);

      Profiling.log({
        msg: `[ADMIN] Matches for tournament ${tournament.label} created successfully!`,
        data: {
          requestId,
          tournamentId: tournament.id,
          matchesCount: Array.isArray(matches) ? matches.length : 0,
          createdBy: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_MATCHES_create',
      });

      return res.status(201).json({
        success: true,
        data: { matches },
        message: `Matches created successfully for tournament "${tournament.label}"`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_MATCHES_create',
        error,
        data: {
          requestId,
          operation: 'admin_matches_creation',
          adminUser: req.authenticatedUser?.nickName,
        },
      });
      return handleInternalServerErrorResponse(res, error);
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  }

  static async updateMatches(req: Request, res: Response) {
    const requestId = randomUUID();
    let scraper: BaseScraper | null = null;

    try {
      if (!req.body.tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      // Get tournament rounds - matches need rounds to be created first
      const rounds = await QUERIES_TOURNAMENT_ROUND.getAllRounds(tournament.id);
      if (rounds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Tournament rounds not found. Please create rounds first.',
        });
      }

      Profiling.log({
        msg: `[ADMIN] Updating matches for tournament ${tournament.label}..........`,
        data: {
          requestId,
          tournamentLabel: tournament.label,
          tournamentId: tournament.id,
          roundsCount: rounds.length,
          updatedBy: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_MATCHES_update',
      });

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new MatchesDataProviderService(scraper, requestId);

      // For updates, we'll process all rounds but use the update method
      const allMatches: number[] = [];
      for (const round of rounds) {
        try {
          const roundMatches = await dataProviderService.updateRound(round);
          allMatches.push(...(Array.isArray(roundMatches) ? roundMatches : []));
        } catch (roundError) {
          Profiling.error({
            source: 'ADMIN_SERVICE_MATCHES_update',
            error: roundError,
            data: {
              roundId: round.id,
              roundSlug: round.slug,
              note: 'Individual round update failed, continuing with other rounds',
            },
          });
          // Continue with other rounds
        }
      }

      Profiling.log({
        msg: `[ADMIN] Matches for tournament ${tournament.label} updated successfully!`,
        data: {
          requestId,
          tournamentId: tournament.id,
          matchesCount: allMatches.length,
          updatedBy: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_MATCHES_update',
      });

      return res.status(200).json({
        success: true,
        data: { matches: allMatches },
        message: `${allMatches.length} matches updated successfully for tournament "${tournament.label}"`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_MATCHES_update',
        error,
        data: {
          requestId,
          operation: 'admin_matches_update',
          adminUser: req.authenticatedUser?.nickName,
        },
      });
      return handleInternalServerErrorResponse(res, error);
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  }
}

export { AdminMatchesService };
