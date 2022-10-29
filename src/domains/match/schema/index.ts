import mongoose from 'mongoose'

export const MATCH_COLLECTION_NAME = 'Match'

export interface IMatch {
  host: String
  visitor: String
  date: Date
  tournamentId: String
  stadium?: String
}

export const MatchSchema = new mongoose.Schema({
  host: {
    type: String,
    require: true
  },
  visitor: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now()
  },
  tournamentId: {
    type: String,
    require: true
  },
  stadium: {
    type: String,
    require: true
  }
})

export default mongoose.model(MATCH_COLLECTION_NAME, MatchSchema)
