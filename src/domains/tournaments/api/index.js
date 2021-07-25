const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId
// const jwt = require('jsonwebtoken')
// const { fileLogger } = require('../../../utils/logger')

// Project's Config
// const { errorsMap, USER_COOKIE_NAME } = require('../../config')

// Model
const Tournament = require('../model')

// MiddlewaresTokenExpiredError
// const authorization = require('../../middlewares/authorization')

const { API_VERSION } = require('../../../config')


const getAllTournaments = async (req, res) => {
  try {
    const allTournaments = await Tournament.find()

    res.status(200).send(allTournaments)
  } catch (err) {
     res.status(500).send("generic error")
  }
}

const createTournament = async (req, res) => {
    if (!req.body) {
      res.status(400).send('empty body for a tournament post')
    }

    const newTournament = await new Tournament({ ...req.body })

    try{
      const insertionResult = await newTournament.save()

      res.status(200).send(insertionResult)
    }catch(error) {
      const errorMessage = error.code == 11000 ? "Mongo DB: duplicated key" : "Mongo DB error when trying to save()";

      res.status(500).send({...error, errorMessage })
    }
}


router.route("/")
  .get(getAllTournaments)
  .post(createTournament)


module.exports = router
