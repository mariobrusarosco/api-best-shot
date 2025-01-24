import express from 'express'
import ApplicationRouter from '@/router'
import ScoreController from '../controllers/score-controllers'

const RouterV1 = express.Router()
RouterV1.get('/league/:leagueId', ScoreController.getLeagueScore)

ApplicationRouter.register("api/v1/scores", RouterV1)

const RouterV2 = express.Router()
RouterV2.get('/league/:leagueId', ScoreController.getLeagueScore)

ApplicationRouter.register("api/v2/scores", RouterV2)
