import express from 'express'
import mongoose from 'mongoose'
import middleware1 from './middlewares/middleware1'
import middleware2 from './middlewares/middleware2'

import TournamentRouting from './domains/tournament/routes'
import LeagueRouting from './domains/league/routes'
import MatchRouting from './domains/match/routes'
import UserRouting from './domains/user/routes'
import logger from './middlewares/logger'
import FileRouting from './playground/sending-files'
import ServingWebsites from './playground/serving-sites'
import TemplateEngines from './playground/template-engines'
import databaseService from './services/database'

const PORT = process.env.PORT || 3000

const app = express()

// JSON Parser Middleware
app.use(express.json())
app.use(logger)

// Rest routes - temporary place
TournamentRouting(app)
LeagueRouting(app)
UserRouting(app)
MatchRouting(app)
// Rest routes - temporary place'

// Playground Area
FileRouting(app)
ServingWebsites(app)
TemplateEngines(app)

async function startServer() {
  console.log('best shot api!')
  // DB Connection
  await databaseService.connect()

  app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
}

startServer()

export default app

// Middleware flow POC!
// app.use(middleware1)
// app.use(middleware2)
// app.get('/middlewares', (_, res) => {
//   console.log('GET on /middlewares')
//   res.send('middlewares')
// })
// Middleware flow POC!
