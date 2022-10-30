import mongoose from 'mongoose'

const Tournament = new mongoose.Schema({
  label: {
    type: String,
    require: true
  },
  description: {
    type: String,
    required: true
  },
  flag: String // 'base64://'
})

export { Tournament }
