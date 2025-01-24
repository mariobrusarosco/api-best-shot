import { AuthMiddleware } from '@/domains/auth/middleware';
import { API_Guess } from '@/domains/guess/api';
import MatchController from '@/domains/match/controllers/match-controller';
import { PerformanceController } from '@/domains/performance/controller';
import express from 'express';
import { API_Tournament } from '../api';
import TournamentController from '../controllers/tournament-controllers';
import ApplicationRouter from '@/router';

const RouterV1 = express.Router();

RouterV1.get('/', API_Tournament.getAllTournaments);
RouterV1.get('/:tournamentId', AuthMiddleware, API_Tournament.getTournament);
RouterV1.get('/:tournamentId/matches/:roundId', MatchController.getMatchesByTournament);
RouterV1.get('/:tournamentId/guess', AuthMiddleware, API_Guess.getMemberGuesses);
RouterV1.get('/:tournamentId/score', AuthMiddleware, TournamentController.getTournamentScore);
RouterV1.get('/:tournamentId/performance', AuthMiddleware, API_Tournament.getTournamentPerformanceForMember);
RouterV1.patch('/:tournamentId/performance', AuthMiddleware, PerformanceController.updateTournamentPerformance);
RouterV1.get('/:tournamentId/standings', AuthMiddleware, API_Tournament.getTournamentStandings);
RouterV1.post('/:tournamentId/setup', AuthMiddleware, TournamentController.setupTournament);

ApplicationRouter.register("api/v1/tournaments", RouterV1);

const RouterV2 = express.Router();
// Copy same routes as V1
RouterV2.get('/', API_Tournament.getAllTournaments);
RouterV2.get('/:tournamentId', AuthMiddleware, API_Tournament.getTournament);
RouterV2.get('/:tournamentId/matches/:roundId', MatchController.getMatchesByTournament);
RouterV2.get('/:tournamentId/guess', AuthMiddleware, API_Guess.getMemberGuesses);
RouterV2.get('/:tournamentId/score', AuthMiddleware, TournamentController.getTournamentScore);
RouterV2.get('/:tournamentId/performance', AuthMiddleware, API_Tournament.getTournamentPerformanceForMember);
RouterV2.patch('/:tournamentId/performance', AuthMiddleware, PerformanceController.updateTournamentPerformance);
RouterV2.get('/:tournamentId/standings', AuthMiddleware, API_Tournament.getTournamentStandings);
RouterV2.post('/:tournamentId/setup', AuthMiddleware, TournamentController.setupTournament);

ApplicationRouter.register("api/v2/tournaments", RouterV2);
