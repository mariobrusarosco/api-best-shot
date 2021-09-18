const express = require('express')
const Router = express.Router()

// Configuration
const { API_VERSION } = require('../config')
// Auth Middleware
const authorization = require('../middlewares/authorization')

const users = require('./users')
const notes = require('./notes')
// const auth = require('./auth')
const modes = require('./modes')


console.log({users})

Router.use(`${API_VERSION}/users`, users)
// Router.use(`${API_VERSION}/auth`, auth)
Router.use(`${API_VERSION}/notes`, notes)
// Router.use(`${API_VERSION}/me`, require('./me'))
// Router.use(`${API_VERSION}/logout`, require('./logout'))
// Router.use(`${API_VERSION}/modes`, modes)

module.exports = Router
