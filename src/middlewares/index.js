const helmet = require('helmet')
const express = require('express')
const morgan = require('morgan')
const passport = require('passport')
const cookieSession = require('cookie-session')
const cookieParser = require('cookie-parser')

module.exports = app => {
  //TODO move this to a separate function
  app.use(function(req, res, next) {
    // console.log('passed cookies in a request', req.cookies)

    res.header('Access-Control-Allow-Origin', "*")
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin'
    )
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS')

    next()
  })

  app.use(express.json())
  // // TODO Pass this section code to a separated file
  // app.use(
  //   cookieSession({
  //     maxAge: 30 * 60 * 1000,
  //     keys: [process.env.USER_TOKEN_SECRET]
  //   })
  // )
  // app.use(passport.initialize())
  // app.use(passport.session())
  app.use(morgan('tiny'))
  app.use(helmet())
  // TODO Remove this middleware if cookie strategy works fine
  app.use(cookieParser())
}
