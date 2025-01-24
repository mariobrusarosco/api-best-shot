import express from 'express';
import ApplicationRouter from '@/router';
import { AuthMiddleware } from '@/domains/auth/middleware';
import { API_Teams } from '@/domains/data-provider/api/teams';
import { API_Tournament } from '@/domains/data-provider/api/tournament';
import { API_TournamentRounds } from '@/domains/data-provider/api/tournament-round';
import { API_Matches } from '../api/matches';
import { API_Scheduler } from '../api/scheduler';
import { API_Standings } from '../api/standings/standings';

const RouterV1 = express.Router();
RouterV1.use(AuthMiddleware);

// TOURNAMENTS
RouterV1.post('/tournaments', API_Tournament.setup);
RouterV1.patch('/tournaments/:tournamentId', API_Tournament.update);

// TOURNAMENT ROUNDS
RouterV1.post('/tournaments/:tournamentId/rounds', API_TournamentRounds.createRounds);
RouterV1.patch('/tournaments/:tournamentId/rounds', API_TournamentRounds.updateRounds);
RouterV1.post('/tournaments/:tournamentId/rounds/knockout-update', API_TournamentRounds.knockoutRoundsUpdate);

// TEAMS
RouterV1.post('/tournaments/:tournamentId/teams', API_Teams.createTeams);
RouterV1.patch('/tournaments/:tournamentId/teams', API_Teams.updateTeams);

// MATCHES
RouterV1.post('/tournaments/:tournamentId/matches', API_Matches.createMatches);
RouterV1.patch('/tournaments/:tournamentId/matches', API_Matches.updateMatches);
RouterV1.patch('/tournaments/:tournamentId/matches/:roundSlug', API_Matches.updateMatchesForRound);

// STANDINGS
RouterV1.post('/tournaments/:tournamentId/standings', API_Standings.createStandings);
RouterV1.patch('/tournaments/:tournamentId/standings', API_Standings.updateStandings);

// SCHEDULER
RouterV1.post('/scheduler', API_Scheduler.dailyRoutine);

ApplicationRouter.register("api/v1/data-provider", RouterV1);

const RouterV2 = express.Router();
RouterV2.use(AuthMiddleware);
// Copy same routes as V1...
// (repeat all the same routes)

ApplicationRouter.register("api/v2/data-provider", RouterV2);
