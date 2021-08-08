const PORT = process.env.PORT || 9090
const express = require('express')
const dotenv = require("dotenv")
const app = express()
const path = require('path')

// App Setitngs JS Approach
// const config = require('./config')


// App Setitngs DOT ENV approach
dotenv.config({ path: '../.env' })

// Routes Error Handler Middleware
const expressErrorHandler = require('./middlewares/express')

// ERROR HANDLING PROCESS
// require('./logging')()

// DB
require('./db')()

// MIDDLEWARES
require('./middlewares')(app)




// Domains
require('./domains/tournaments')(app)

app.use(expressErrorHandler)
// require('./routes')(app)

// if (process.env.NODE_ENV !== 'local') {
// Serving assets like main.css or main.js
// If this condition fits...code ends here!!
// app.use(
//   assetsCompression('dist', {
//     enableBrotli: true,
//     orderPreference: ['br']
//   })
// )
// app.use(express.static('dist'))

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'))
})

// Listener
app.listen(PORT, () => console.log(`Serving at ${PORT} - ${process.env.NODE_ENV}`))
