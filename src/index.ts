import express from 'express'
import logger from './middlewares/logger'
const cookieParser = require('cookie-parser')
const cors = require('cors')

import TournamentRouting from './domains/tournament/routes'
import LeagueRouting from './domains/league/routes'
import GuessRouting from './domains/guess/routes'
import ScoreRouting from './domains/score/routes'
import AuthRouting from './domains/auth/routes'
import MatchRouting from './domains/match/routes'

const PORT = process.env.PORT || 9090

const app = express()

// JSON Parser Middleware
app.use(express.json())

app.set('trust proxy', 1)
app.use(cookieParser() as any)

const corsConfig = {
  origin: process.env.ACCESS_CONTROL_ALLOW_ORIGIN,
  credentials: true
}
app.use(cors(corsConfig))
app.options('*', cors(corsConfig))

app.use(logger)
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', process.env.ACCESS_CONTROL_ALLOW_ORIGIN)
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin'
  )
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS')

  next()
})

TournamentRouting(app)
AuthRouting(app)
LeagueRouting(app)
GuessRouting(app)
ScoreRouting(app)
MatchRouting(app)

async function startServer() {
  app.listen(PORT, () =>
    console.log(`Listening on port ${PORT} + ${process.env.API_VERSION}`)
  )
}

startServer()

export default app
