import express from 'express'
import middleware1 from './middlewares/middleware1'
import middleware2 from './middlewares/middleware2'

const PORT = 9090

const app = express()

// JSON Parser Middleware
app.use(express.json())

// Middleware flow POC!
app.use(middleware1)
app.use(middleware2)
app.get('/middlewares', (_, res) => {
  console.log('GET on /middlewares')
  res.send('middlewares')
})
// Middleware flow POC!

// Rest routes - temporary place
app.get('/api/v1/tournaments', (req, res) => {
  res.send([])
})

app.post('/api/v1/tournaments', (req, res) => {
  const body = req?.body

  if (!body.label) {
    res.status(400).json({ message: 'You must provide a label for a tournament' })
  }

  res.json(body)
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))

console.log('best shot api!')
