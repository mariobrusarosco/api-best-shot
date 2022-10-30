import express from 'express'
import type { Express } from 'express'
import { join } from 'path'

const FileRouting = (app: Express) => {
  const fileRouter = express.Router()

  fileRouter.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'me-rapper.webp'))
  })

  app.use('/files/playground', fileRouter)
}

export default FileRouting
