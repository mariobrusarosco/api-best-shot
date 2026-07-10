import express from 'express';
import { listWorldCupEditions } from './repository';

const almanacRouter = express.Router();

almanacRouter.get('/hello', (_req, res) => {
  res.type('text/plain').send('hello wordl');
});

almanacRouter.get('/world-cups', async (_req, res) => {
  try {
    const editions = await listWorldCupEditions();

    res.json({ editions });
  } catch (error) {
    console.error('Unable to list World Cup editions', error);
    res.status(500).json({ message: 'Unable to list World Cup editions' });
  }
});

export default almanacRouter;
