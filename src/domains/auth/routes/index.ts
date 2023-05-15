import express from 'express'
import type { Express } from 'express'
import AuthController from '../controllers/auth-controllers'

const AuthRouting = (app: Express) => {
  const userRouter = express.Router()

  // userRouter.get('/', AuthController.start)
  userRouter.post('/', AuthController.createUser)
  // userRouter.post('/', AuthController.createUser)

  app.use(`${process.env.API_V1_VERSION}/auth`, userRouter)
}

export default AuthRouting
