import mongoose from 'mongoose'

export const LEAGUE_COLLECTION_NAME = 'League'

export interface ILeague {
  label: String
  description: String
  flag: String
  members: String[]
  admin: String
  tournament: String
}

export const LeagueSchema = new mongoose.Schema({
  label: {
    type: String,
    require: true
  },
  description: {
    type: String,
    required: true
  },
  flag: {
    type: String, // 'base64://',
    default: 'https://www.my-flag.com/unknown'
  },
  members: {
    type: [String], // ObjectId. Posible [RELATIONSHIP]
    required: true
  },
  admins: {
    type: [String],
    required: true
  },
  tournaments: {
    type: [String],
    require: true
  }
})

export default mongoose.model(LEAGUE_COLLECTION_NAME, LeagueSchema)
