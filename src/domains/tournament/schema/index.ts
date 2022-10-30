import { Schema, model } from 'mongoose'

export const TOURNAMENT_COLLECTION_NAME = 'Tournament'

export interface ITournament {
  label: String
  description: String
  flag: String
}

export const TournamentSchema = new Schema<ITournament>({
  label: {
    type: String,
    require: true,
    unique: true,
    dropDups: true
  },
  description: {
    type: String,
    required: true
  },
  flag: {
    type: String, // 'base64://',
    default: 'https://www.my-flag.com/unknown'
  }
})

export default model(TOURNAMENT_COLLECTION_NAME, TournamentSchema)
