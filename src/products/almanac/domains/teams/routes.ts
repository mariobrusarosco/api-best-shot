import express from 'express';
import { listTeams } from './service';

const teamsRouter = express.Router();

teamsRouter.get('/', async (_req, res) => {
  try {
    const teams = await listTeams();

    res.json({ teams });
  } catch (error) {
    console.error('Unable to list Almanac teams', error);
    res.status(500).json({ message: 'Unable to list Almanac teams' });
  }
});

export default teamsRouter;
