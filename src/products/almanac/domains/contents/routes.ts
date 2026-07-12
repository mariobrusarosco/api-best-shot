import express from 'express';
import { listContents } from './service';

const contentsRouter = express.Router();

contentsRouter.get('/', async (_req, res) => {
  try {
    const contents = await listContents();

    res.json({ contents });
  } catch (error) {
    console.error('Unable to list Almanac contents', error);
    res.status(500).json({ message: 'Unable to list Almanac contents' });
  }
});

export default contentsRouter;
