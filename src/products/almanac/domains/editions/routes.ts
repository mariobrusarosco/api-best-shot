import express from 'express';
import { listWorldCupEditions } from './service';

const editionsRouter = express.Router();

editionsRouter.get('/', async (_req, res) => {
  try {
    const editions = await listWorldCupEditions();

    res.json({ editions });
  } catch (error) {
    console.error('Unable to list World Cup editions', error);
    res.status(500).json({ message: 'Unable to list World Cup editions' });
  }
});

export default editionsRouter;
