import express from 'express';
import editionsRouter from './domains/editions/routes';

const almanacRouter = express.Router();

almanacRouter.get('/hello', (_req, res) => {
  res.type('text/plain').send('hello wordl');
});

almanacRouter.use('/world-cups', editionsRouter);

export default almanacRouter;
