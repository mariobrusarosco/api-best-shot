const express = require('express')
const Router = express.Router()
// const Joi = require('@hapi/joi')
const R = require('ramda')

// Project's Config
const { errorsMap, USER_COOKIE_NAME } = require('../../config')

// Middlewares
const authorization = require('../../middlewares/authorization')

// Utils
const { validateNewUser, validateExistingUser } = require('../../utils/validations')
const { userPublicData } = require('../../utils/User')
const { fileLogger, consoleLogger } = require('../../utils/logger')

const hashPassword = async password => {
  const bcrypt = require('bcrypt')
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  return hashedPassword
}

// Models
const User = require('../../models/User')

Router.get('/', async (req, res) => {
  const allUsers = await User.find()

  res.send(allUsers)
})

Router.patch('/:id', authorization, async (req, res) => {
  const body = req.body
  const id = req.params.id
  /*
   * Exisitng User Verification
   */
  const user = await User.findById(id)

  if (!user) {
    return res.status(400).send(errorsMap['A09'])
  }

  /*
   * Updating User
   */
  const updatedUser = await User.findOneAndUpdate(
    { _id: id },
    {
      $set: { ...body }
    },
    { new: true }
  )
  /*
   * Saving the Updated User
   */
  await updatedUser.save()

  /*
   * Updating User's cookie
   */
  const userToken = updatedUser.generateUserIdToken()

  res.cookie(USER_COOKIE_NAME, userToken, {
    // expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
  })

  res.send(userPublicData(updatedUser))
})

Router.post('/', async (req, res) => {
  const body = R.pathOr({}, ['body'], req)
  /*
   * Validation Errors
   */
  const { error } = validateNewUser(body)

  if (error) {
    const errorMessage = errorsMap[error.message]

    fileLogger.error({ message: errorMessage, error })
    consoleLogger.error({ message: errorMessage, error })

    return res.status(400).send(errorMessage)
  }
  /*
   * User already registered Validation
   */
  const { email } = body

  const existingUser = await User.findOne({ 'authTypes.emailAndPassword.email': email })

  if (existingUser) {
    return res.status(400).send(errorsMap['A07'])
  }

  /*
   * New User scenario
   */
  const { password, firstname, lastname, username } = body

  const hashedPassword = await hashPassword(password)

  const newUser = new User({
    firstname,
    lastname,
    username,
    authTypes: {
      emailAndPassword: {
        active: true,
        email,
        password: hashedPassword
      }
    }
  })

  await newUser.save()

  return res.send('Thanks!! Your user was successfully registered!')
})

Router.put('/', async (req, res) => {
  //  Validation Errors
  const { error } = validateExistingUser(req.body)

  if (error) {
    return res.status(400).send(errorsMap[error.message])
  }

  const { id } = req.body

  const user = await User.findById(id)

  if (!user) {
    return res.send('user not found')
  }

  // Query and then update approach

  // Assigning new properties
  user.isPublished = false
  user.name = "Walter 'Heisenberg' White"

  // Using ge .set() method
  user.set({
    isPublished: false,
    name: "Walter 'Heisenberg' White"
  })

  // Update First approach
  const updatedUser = await User
    .findOneAndUpdate(
      {_id: mockedId },
      {
        $set: {
          name: 'bbbbb',
          isPublished: false
        }
      },
      { new: true }
    ).select('name')

  // const updatedUser = await user.save()

  res.send(updatedUser)
})

module.exports = Router

// Using .validate() from mongoose
// newUser.validate()
// 	.then(data => {
// 		console.log('data', data)
// 	})
// 	.catch(e => console.error(e.message))
// const validation = await newUser.validate()

// 		try {
// 			const result = await newUser.save()

// 			res.send(result)
// 		} catch (e) {
// 			const errors = Object.keys(e.errors)
// 				.map(error => e.errors[error]['message'])

// 				res.status(400).send(errors)
// 		}
// })

//
// Router.delete('/', async (req, res) => {
// 	const mockedId = '5c68273df7f5d0328bd50303'

// 	const deletedUser = await User.findOneAndRemove(
// 		{
// 			_id: mockedId,
// 		}
// 	)

// 	res.send(deletedUser)
// })
