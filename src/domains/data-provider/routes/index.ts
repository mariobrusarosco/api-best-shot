import express from 'express';
import ApplicationRouter from '@/router';
import { AuthMiddleware } from '@/domains/auth/middleware';
import {
    API_TEAMS,
    API_TOURNAMENT,
    API_TOURNAMENT_ROUNDS,
    API_MATCHES,
    API_SCHEDULER,
    API_STANDINGS,
    API_TOURNAMENT_V2
} from '../api';

const RouterV1 = express.Router();
RouterV1.use(AuthMiddleware);

// TOURNAMENTS
RouterV1.post('/tournaments', API_TOURNAMENT.setup);
RouterV1.patch('/tournaments/:tournamentId', API_TOURNAMENT.update);

// TOURNAMENT ROUNDS
RouterV1.post('/tournaments/:tournamentId/rounds', API_TOURNAMENT_ROUNDS.createRounds);
RouterV1.patch('/tournaments/:tournamentId/rounds', API_TOURNAMENT_ROUNDS.updateRounds);
RouterV1.post('/tournaments/:tournamentId/rounds/knockout-update', API_TOURNAMENT_ROUNDS.knockoutRoundsUpdate);

// TEAMS
RouterV1.post('/tournaments/:tournamentId/teams', API_TEAMS.createTeams);
RouterV1.patch('/tournaments/:tournamentId/teams', API_TEAMS.updateTeams);

// MATCHES
RouterV1.post('/tournaments/:tournamentId/matches', API_MATCHES.createMatches);
RouterV1.patch('/tournaments/:tournamentId/matches', API_MATCHES.updateMatches);
RouterV1.patch('/tournaments/:tournamentId/matches/:roundSlug', API_MATCHES.updateMatchesForRound);

// STANDINGS
RouterV1.post('/tournaments/:tournamentId/standings', API_STANDINGS.createStandings);
RouterV1.patch('/tournaments/:tournamentId/standings', API_STANDINGS.updateStandings);

// SCHEDULER
RouterV1.post('/scheduler', API_SCHEDULER.dailyRoutine);

ApplicationRouter.register("api/v1/data-provider", RouterV1);

const RouterV2 = express.Router();
// RouterV2.use(AuthMiddleware);

RouterV2.post('/tournaments', API_TOURNAMENT_V2.setup);

ApplicationRouter.register("api/v2/data-provider", RouterV2);
