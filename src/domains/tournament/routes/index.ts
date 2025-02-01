import { AuthMiddleware } from '@/domains/auth/middleware';
import { API_GUESS } from '@/domains/guess/api';
import { API_MATCH } from '@/domains/match/api';
import { API_PERFORMANCE } from '@/domains/performance/api';
import express from 'express';
import { API_TOURNAMENT } from '../api';
import ApplicationRouter from '@/router';

const RouterV1 = express.Router();
RouterV1.use(AuthMiddleware);

RouterV1.get('/', API_TOURNAMENT.getAllTournaments);
RouterV1.get('/:tournamentId', API_TOURNAMENT.getTournamentDetails);
RouterV1.get('/:tournamentId/matches/:roundId', API_MATCH.getMatchesByTournament);
RouterV1.get('/:tournamentId/guess', API_GUESS.getMemberGuesses);
RouterV1.get('/:tournamentId/score', API_TOURNAMENT.getTournamentScore);
RouterV1.get('/:tournamentId/performance', API_TOURNAMENT.getTournamentPerformanceForMember);
RouterV1.patch('/:tournamentId/performance', API_PERFORMANCE.updateTournamentPerformance);
RouterV1.get('/:tournamentId/standings', API_TOURNAMENT.getTournamentStandings);
RouterV1.post('/:tournamentId/setup', API_TOURNAMENT.setupTournament);

ApplicationRouter.register("api/v1/tournaments", RouterV1);

const RouterV2 = express.Router();
RouterV2.use(AuthMiddleware);

RouterV2.get('/', API_TOURNAMENT.getAllTournaments);
RouterV2.get('/:tournamentId', API_TOURNAMENT.getTournamentDetails);
RouterV2.get('/:tournamentId/matches/:roundId', API_MATCH.getMatchesByTournament);
RouterV2.get('/:tournamentId/guess', API_GUESS.getMemberGuesses);
RouterV2.get('/:tournamentId/score', API_TOURNAMENT.getTournamentScore);
RouterV2.get('/:tournamentId/performance', API_TOURNAMENT.getTournamentPerformanceForMember);
RouterV2.patch('/:tournamentId/performance', API_PERFORMANCE.updateTournamentPerformance);
RouterV2.get('/:tournamentId/standings', API_TOURNAMENT.getTournamentStandings);
RouterV2.post('/:tournamentId/setup', API_TOURNAMENT.setupTournament);

ApplicationRouter.register("api/v2/tournaments", RouterV2);
