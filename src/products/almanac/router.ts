import express from 'express';
import editionsRouter from './domains/editions/routes';
import teamsRouter from './domains/teams/routes';

const almanacRouter = express.Router();

almanacRouter.get('/hello', (_req, res) => {
  res.type('text/plain').send('hello wordl');
});

almanacRouter.use('/editions', editionsRouter);
almanacRouter.use('/teams', teamsRouter);

export default almanacRouter;
