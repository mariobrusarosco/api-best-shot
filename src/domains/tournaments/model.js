const mongoose = require('mongoose')

const TournamentSchema = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'A tournament label is required'],
    index: true,
    unique: true,
  },
  flag: String,
  description: String,

})


const Tournament = mongoose.model("Tournament", TournamentSchema)
Tournament.createIndexes()

module.exports = Tournament
