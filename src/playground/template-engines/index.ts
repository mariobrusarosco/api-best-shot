import express from 'express'
import type { Express } from 'express'
import path from 'path'

const TemplateEngines = (app: Express) => {
  app.set('view engine', 'hbs')
  app.set('views', path.join(__dirname, 'views'))

  app.get('/', (req, res) => {
    res.render('index', { userName: 'Mario', title: 'Index' })
  })

  app.get('/articles', (req, res) => {
    res.render('articles', { placeholder: 'Lorem Ipsum', title: 'Articles' })
  })
}

export default TemplateEngines
