import express from 'express';
import logger from './middlewares/logger';
const cookieParser = require('cookie-parser');
const cors = require('cors');

import AuthRouting from './domains/auth/routes';
import DataProviderRouting from './domains/data-provider-v2/routes';
import GuessRouting from './domains/guess/routes';
import LeagueRouting from './domains/league/routes';
import MatchRouting from './domains/match/routes';
import MemberRouting from './domains/member/routes';
import ScoreRouting from './domains/score/routes';
import accessControl from './domains/shared/middlewares/access-control';
import TournamentRouting from './domains/tournament/routes';

const PORT = process.env.PORT || 9090;

const app = express();

// JSON Parser Middleware
app.use(express.json());

app.set('trust proxy', 1);
app.use(cookieParser() as any);

const corsConfig = {
  origin: process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
  credentials: true,
};
app.use(cors(corsConfig));
app.options('*', cors(corsConfig));

app.use(logger);
app.use(accessControl);

TournamentRouting(app);
AuthRouting(app);
LeagueRouting(app);
GuessRouting(app);
ScoreRouting(app);
MatchRouting(app);
DataProviderRouting(app);
MemberRouting(app);

async function startServer() {
  app.listen(PORT, () =>
    console.log(`Listening on port ${PORT} + ${process.env.API_VERSION}`)
  );
}

startServer();

export default app;
