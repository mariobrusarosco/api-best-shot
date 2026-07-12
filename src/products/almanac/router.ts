import express from 'express';
import contentsRouter from './domains/contents/routes';
import editionsRouter from './domains/editions/routes';
import teamsRouter from './domains/teams/routes';

const almanacRouter = express.Router();

almanacRouter.get('/hello', (_req, res) => {
  res.type('text/plain').send('hello wordl');
});

almanacRouter.use('/contents', contentsRouter);
almanacRouter.use('/editions', editionsRouter);
almanacRouter.use('/teams', teamsRouter);

export default almanacRouter;
