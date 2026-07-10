import express from 'express';

const almanacRouter = express.Router();

almanacRouter.get('/hello', (_req, res) => {
  res.type('text/plain').send('hello wordl');
});

export default almanacRouter;
