import express from 'express'
import type { Express } from 'express'
import AuthController from '../controllers/auth-controllers'

const AuthRouting = (app: Express) => {
  const memberRouter = express.Router()

  memberRouter.post('/', AuthController.getMember)

  app.use(`${process.env.API_VERSION}/whoami`, memberRouter)
}

export default AuthRouting
