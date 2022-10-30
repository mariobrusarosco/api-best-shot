import mongoose from 'mongoose'

const connect = () => {
  return mongoose
    .connect(process.env.DB_CREDENTIALS ?? '')
    .then(() => {
      console.log('Connected to a mongo DB')
    })
    .catch(error => {
      console.error('bad connection', error)
      new Error('Mongo connection error')
    })
}

const close = () => mongoose.disconnect()

export default { connect, close }
