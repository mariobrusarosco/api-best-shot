import { Schema, model } from 'mongoose'

// Old schema
// _id
// 62b4d7cba8a6227e9a2ef117
// authTypes
// Object
// emailAndPassword
// Object
// active
// true
// email
// "mariobrusarosco@hotmail.com"
// password
// "$2b$10$HFPtkF6jJCXGUd2TDJjfqOOuQ9b4.TXZt2zvKs6DANGdMVp29mnaW"
// google
// Object
// twitter
// Object
// emailVerified
// false
// lastAccess
// 2022-06-23T21:14:46.822+00:00
// firstname
// "Mario"
// lastname
// "Brusarosco"
// __v
// 0

export const USER_COLLECTION_NAME = 'User'

export interface IUser {
  email: string
  password: string
  firstName: string
  lastName: string
  leagues: string[]
  token: string
}

export const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    require: true,
    unique: true,
    dropDups: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  leagues: {
    type: [String],
    required: true
  },
  token: {
    type: String
  }
})

export default model(USER_COLLECTION_NAME, UserSchema)
