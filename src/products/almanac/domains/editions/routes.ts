import express from 'express';
import { getEditionDetail, listEditions } from './service';

const editionsRouter = express.Router();

editionsRouter.get('/', async (_req, res) => {
  try {
    const editions = await listEditions();

    res.json({ editions });
  } catch (error) {
    console.error('Unable to list World Cup editions', error);
    res.status(500).json({ message: 'Unable to list World Cup editions' });
  }
});

editionsRouter.get('/:year', async (req, res) => {
  try {
    const year = /^\d{4}$/.test(req.params.year) ? Number(req.params.year) : Number.NaN;
    const result = await getEditionDetail(year);

    if (result.status === 'invalid-year') {
      res.status(400).json({ message: 'Invalid World Cup edition year' });
      return;
    }

    if (result.status === 'not-found') {
      res.status(404).json({ message: 'World Cup edition not found' });
      return;
    }

    res.json({ edition: result.edition });
  } catch (error) {
    console.error('Unable to get World Cup edition', error);
    res.status(500).json({ message: 'Unable to get World Cup edition' });
  }
});

export default editionsRouter;
