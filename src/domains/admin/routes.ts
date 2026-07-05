import express from 'express';

const adminRouter = express.Router();

adminRouter.post('/provider-preview', (_req, res) => {
  res.status(501).json({
    ok: false,
    error: 'Provider preview is not implemented yet',
  });
});

export default adminRouter;
