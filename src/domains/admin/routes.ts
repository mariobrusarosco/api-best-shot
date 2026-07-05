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

const parseResponseData = (contentType: string, body: string): unknown => {
  if (!contentType.includes('application/json')) {
    return body;
  }

  return JSON.parse(body);
};

const fetchSofaScoreUrl = async (url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json,text/plain,text/html,*/*',
      },
    });
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();

    if (!response.ok) {
      return {
        url,
        ok: false,
        status: response.status,
        error: `Provider returned ${response.status}`,
      };
    }

    return {
      url,
      ok: true,
      status: response.status,
      data: parseResponseData(contentType, body),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      error: error instanceof Error ? error.message : 'Provider request failed',
    };
  }
};

adminRouter.post('/provider-preview', async (req, res) => {
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

  const results = await Promise.all(parsedBody.data.urls.map(fetchSofaScoreUrl));

  res.json({
    ok: results.every((result) => result.ok),
    results,
  });
});

export default adminRouter;
