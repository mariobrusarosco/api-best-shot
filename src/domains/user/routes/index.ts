import express from 'express'
import type { Express } from 'express'
import UserController from '../controllers/user-controllers'

const UserRouting = (app: Express) => {
  const userRouter = express.Router()

  userRouter.get('/:userId', UserController.getUser)
  userRouter.get('/', UserController.getAllUsers)
  userRouter.patch('/:userId', UserController.updateUser)

  app.use(`${process.env.API_VERSION}/user`, userRouter)
}

export default UserRouting
