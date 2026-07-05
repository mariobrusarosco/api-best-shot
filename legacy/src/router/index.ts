import express from 'express';

// Admin
import { adminV2Router } from '@/domains/admin/routes';
// AI
import aiV2Router from '@/domains/ai/routes/v2';
// Auth
import { v1Router as authV1Router, v2Router as authV2Router } from '@/domains/auth/routes';
// Dashboard
import { v1 as dashboardV1Router, v2 as dashboardV2Router } from '@/domains/dashboard/routes';
// Guess
import { v1 as guessV1Router, v2 as guessV2Router } from '@/domains/guess/routes';
// League
import { v1 as leagueV1Router, v2 as leagueV2Router } from '@/domains/league/routes';
// Match
import { v1 as matchV1Router, v2 as matchV2Router } from '@/domains/match/routes';
// Member
import { v1 as memberV1Router, v2 as memberV2Router } from '@/domains/member/routes';
// Tournament
import { v1 as tournamentV1Router, v2 as tournamentV2Router } from '@/domains/tournament/routes';

const apiRouter = express.Router();

// Admin
apiRouter.use('/v2/admin', adminV2Router);
// AI
apiRouter.use('/v2/ai', aiV2Router);
// Auth
apiRouter.use('/v1/auth', authV1Router);
apiRouter.use('/v2/auth', authV2Router);
// Dashboard
apiRouter.use('/v1/dashboard', dashboardV1Router);
apiRouter.use('/v2/dashboard', dashboardV2Router);
// Guess
apiRouter.use('/v1/guess', guessV1Router);
apiRouter.use('/v2/guess', guessV2Router);
// League
apiRouter.use('/v1/leagues', leagueV1Router);
apiRouter.use('/v2/leagues', leagueV2Router);
// Match
apiRouter.use('/v1/match', matchV1Router);
apiRouter.use('/v2/match', matchV2Router);
// Member
apiRouter.use('/v1/member', memberV1Router);
apiRouter.use('/v2/member', memberV2Router);
// Tournament
apiRouter.use('/v1/tournaments', tournamentV1Router);
apiRouter.use('/v2/tournaments', tournamentV2Router);

export default apiRouter;
