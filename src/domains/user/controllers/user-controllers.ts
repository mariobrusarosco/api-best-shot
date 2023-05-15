import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { GlobalErrorMapper } from '../../shared/error-handling/mapper'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import User, { IUser } from '../schema'

async function getUserByUsername(email: string) {
  console.log('inside authService')

  return await User.findOne({ email })
}

async function getUserById(id: string) {
  return await User.findById(id)
}

async function getUserByIdAndDelete(id: string) {
  return await User.findByIdAndDelete(id)
}

async function loginUser(email: string, password: string) {
  //get the user
  const user = await User.findOne({ email }, 'email password')

  return { user }

  //validate the hashed password we have in our database
  // const validPassword = await bcrypt.compare(password, user?.password))
  // //2 hours to expire in seconds
  // const maxAge = 2 * 60 * 60
  // //set up the jwt token
  // const token = utils.getToken(username, maxAge)

  // //add token to the user
  // user.token = token
  // //remember to save your modification
  // //https://masteringjs.io/tutorials/mongoose/update
  // await user.save()

  // console.log({ token })

  // return { user, validPassword, token, maxAge }
}

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
    return res.status(400).send('You must provide an email.')
  }

  if (!body.password) {
    return res.status(400).send('You must provide a password.')
  }

  //generate salt, it can take a while so we use await
  const salt = await bcrypt.genSalt(10)
  //hash password
  const hashedPassword = await bcrypt.hash(body.password, salt)

  try {
    console.log('asdsdssaddas')
    const result = await User.create({
      ...body
    })

    return res.json(result)
  } catch (error: any) {
    console.log('asdsdssaddas', error?.value)
    // if (error?.value === 'NULL') {
    //   return res.status(404).send('user not found. fix the mapper dude')
    // } else {
    //   return handleInternalServerErrorResponse(res, error)
    // }
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
  updateUser,
  getUserByUsername,
  getUserById,
  getUserByIdAndDelete,
  loginUser
}

export default UserController
