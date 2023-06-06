import express from 'express'
import type { Express } from 'express'
import AuthController from '../controllers/auth-controllers'

const AuthRouting = (app: Express) => {
  const userRouter = express.Router()
  console.warn('auth routing', `${process.env.API_VERSION}/auth`)

  userRouter.post('/login', AuthController.loginUser)
  userRouter.post('/', AuthController.createUser)

  app.use(`${process.env.API_VERSION}/auth`, userRouter)
}

export default AuthRouting
