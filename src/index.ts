import express from 'express'
import mongoose from 'mongoose'
import middleware1 from './middlewares/middleware1'
import middleware2 from './middlewares/middleware2'

import TournamentRouting from './domains/tournaments/routes/index'
import logger from './middlewares/logger'
import db from './db'
import FileRouting from './playground/sending-files'
import ServingWebsites from './playground/serving-sites'

const PORT = 9090

const app = express()

db.connect()
mongoose.connection.once('open', () => {
  console.log('Mongo DB connection ready!')
})

mongoose.connection.on('error', err => {
  console.error('error ----- ', err)
})

// JSON Parser Middleware
app.use(express.json())

app.use(logger)

// Middleware flow POC!
// app.use(middleware1)
// app.use(middleware2)
// app.get('/middlewares', (_, res) => {
//   console.log('GET on /middlewares')
//   res.send('middlewares')
// })
// Middleware flow POC!

// Rest routes - temporary place
TournamentRouting(app)
// tournamentRouter(app)

// Rest routes - temporary place'

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))

console.log('best shot api!')

// Playground Area
FileRouting(app)
ServingWebsites(app)
