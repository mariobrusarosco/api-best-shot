const mongoose = require('mongoose')

const connect = () => {
  mongoose
    .connect(process.env.DB_CREDENTIALS, { useNewUrlParser: true,  useUnifiedTopology: true })
    .then(() => {
      console.log('Connected to a mongo DB')
    })
    .catch(error => {
      console.error("bad connection", error)
      new Error({ type: 'Mongo connection error', message: error })
    })
}

const close = () => mongoose.disconnect()

module.exports = { connect, close }
