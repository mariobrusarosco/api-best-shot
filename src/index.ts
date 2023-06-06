import express from 'express'
import mongoose from 'mongoose'
const cookieParser = require('cookie-parser')
const cors = require('cors')
import middleware1 from './middlewares/middleware1'
import middleware2 from './middlewares/middleware2'

import TournamentRouting from './domains/tournament/routes'
import LeagueRouting from './domains/league/routes'
import MatchRouting from './domains/match/routes'
import UserRouting from './domains/user/routes'
import AuthRouting from './domains/auth/routes'
import logger from './middlewares/logger'
import FileRouting from './playground/sending-files'
import ServingWebsites from './playground/serving-sites'
import TemplateEngines from './playground/template-engines'
import databaseService from './services/database'

const PORT = process.env.PORT || 9090

const app = express()

// JSON Parser Middleware
app.use(express.json())

// console.log(cookieParser())
console.log('----------', process.env.ACESS_CONTROL_ALLOW_ORIGIN, process.env.NODE_ENV)
// Temp middlewares

app.use(cookieParser() as any)

const corsConfig = {
  origin: process.env.ACESS_CONTROL_ALLOW_ORIGIN,
  credentials: true
}
app.use(cors(corsConfig))
// app.options('*', cors(corsConfig))

app.use(logger)
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', process.env.ACESS_CONTROL_ALLOW_ORIGIN)
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin'
  )
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS')

  next()
})

// Rest routes - temporary place
TournamentRouting(app)
LeagueRouting(app)
UserRouting(app)
MatchRouting(app)
AuthRouting(app)
// Rest routes - temporary place'

// Playground Area
// FileRouting(app)
// ServingWebsites(app)
// TemplateEngines(app)

async function startServer() {
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
