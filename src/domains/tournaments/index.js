const express = require('express')
const router = express.Router()

// const { API_VERSION } = process.env
const { API_VERSION } = require('../../config')

// Auth Middleware
// const authorization = require('../middlewares/authorization')

const apiHandlers = require("./api")

module.exports = app => {
  console.log("[Domain] - Tournaments")

  app.use(`${API_VERSION}/tournaments`, apiHandlers)
}

