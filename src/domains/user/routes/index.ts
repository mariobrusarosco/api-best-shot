import express from 'express'
import type { Express } from 'express'
import UserController from '../controllers/user-controllers'

const UserRouting = (app: Express) => {
  const userRouter = express.Router()

  userRouter.get('/', UserController.getAllUsers)
  userRouter.post('/', UserController.createUser)

  app.use(`${process.env.API_V1_VERSION}/user`, userRouter)
}

export default UserRouting