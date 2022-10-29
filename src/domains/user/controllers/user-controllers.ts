import { Request, Response } from 'express'
import { GlobalErrorMapper } from '../../shared/error-handling/mapper'
import User, { IUser } from '../schema'

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
    // log here: ErrorMapper.BIG_FIVE_HUNDRED.debug
    return res
      .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
      .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
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

    res.json(result)
  } catch (error: any) {
    if (error?.value === 'NULL') {
      return res.status(404).send('user not found. fix the mapper dude')
    } else {
      console.error(error)
      // log here: ErrorMapper.BIG_FIVE_HUNDRED.debug
      res
        .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
        .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
    }
  }
}

const UserController = {
  getAllUsers,
  createUser
}

export default UserController
