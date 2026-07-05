import express from 'express';
import { z } from 'zod';

const adminRouter = express.Router();

const isSofaScoreUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' &&
      (url.hostname === 'sofascore.com' || url.hostname.endsWith('.sofascore.com'))
    );
  } catch {
    return false;
  }
};

const providerPreviewRequestSchema = z
  .object({
    urls: z
      .array(
        z
          .string()
          .url()
          .refine(isSofaScoreUrl, 'URL must use https and belong to sofascore.com')
      )
      .min(1, 'At least one URL is required')
      .max(10, 'At most 10 URLs are allowed'),
  })
  .strict();

adminRouter.post('/provider-preview', (req, res) => {
  const parsedBody = providerPreviewRequestSchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(400).json({
      ok: false,
      error: 'Invalid request',
      issues: parsedBody.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  res.status(501).json({
    ok: false,
    urls: parsedBody.data.urls,
    error: 'Provider preview fetch is not implemented yet',
  });
});

export default adminRouter;
