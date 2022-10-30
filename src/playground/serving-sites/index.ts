import express from 'express'
import type { Express } from 'express'
import { join } from 'path'

const ServingWebsites = (app: Express) => {
  app.use('/site', express.static(join(__dirname, 'public')))
}

export default ServingWebsites
