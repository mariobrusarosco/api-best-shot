import { Request, Response } from 'express'
import { GlobalErrorMapper } from '../../shared/error-handling/mapper'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import User, { IUser } from '../schema'

async function getUser(req: Request, res: Response) {
  try {
    const userId = req?.params.userId

    const user = await User.findOne(
      { _id: userId },
      {
        __v: 0
      }
    )

    if (user) {
      return res.status(200).json(user)
    } else {
      return res.status(404).json({ message: 'User Not Found' })
    }
  } catch (error) {
    console.log({ error })

    handleInternalServerErrorResponse(res, error)
  }
}

async function getAllUsers(req: Request, res: Response) {
  try {
    const allLeagues = await User.find(
      {},
      {
        __v: 0
      }
    )
    return res.status(200).send(allLeagues)
  } catch (error) {
    handleInternalServerErrorResponse(res, error)
  }
}

async function createUser(req: Request, res: Response) {
  const body = req?.body as IUser

  if (!body.email) {
    return res.status(400).send('You must provide an email to update a league')
  }

  try {
    const result = await User.create({
      ...body
    })

    return res.json(result)
  } catch (error: any) {
    if (error?.value === 'NULL') {
      return res.status(404).send('user not found. fix the mapper dude')
    } else {
      return handleInternalServerErrorResponse(res, error)
    }
  }
}

async function updateUser(req: Request, res: Response) {
  const body = req?.body as IUser
  const userId = req?.params?.userId

  // console.log({ body })

  try {
    const updatedUser = await User.findOneAndUpdate({ _id: userId }, body, {
      returnDocument: 'after'
    })

    console.log({ updatedUser })

    res.json(updatedUser)
  } catch (error) {
    console.error(error)
    return res
      .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
      .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
  }
}

const UserController = {
  getAllUsers,
  createUser,
  getUser,
  updateUser
}

export default UserController
