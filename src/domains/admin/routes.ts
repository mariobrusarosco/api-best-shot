import express from 'express';
import type { Browser } from 'playwright';
import { z } from 'zod';

type ProviderPreviewResult = {
  url: string;
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
};

type ProviderPreviewWarmup = {
  url: string;
  ok: boolean;
  status?: number;
  finalUrl?: string;
  error?: string;
};

type ProviderPreviewRun = {
  warmup: ProviderPreviewWarmup;
  results: ProviderPreviewResult[];
};

const adminRouter = express.Router();

const defaultSofaScorePageUrl =
  'https://www.sofascore.com/football/tournament/brazil/brasileirao-serie-b/390';

const browserSessionWaitMs = 5000;

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
    pageUrl: z
      .string()
      .url()
      .refine(isSofaScoreUrl, 'Page URL must use https and belong to sofascore.com')
      .optional(),
  })
  .strict();

const parseBrowserResponse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const fetchUrlsFromPageContext = async (
  pageUrl: string,
  urls: string[]
): Promise<ProviderPreviewRun> => {
  let browser: Browser | undefined;

  try {
    const { chromium } = await import('playwright');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const warmupResponse = await page.goto(pageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const warmup: ProviderPreviewWarmup = {
      url: pageUrl,
      ok: warmupResponse?.ok() ?? false,
      status: warmupResponse?.status(),
      finalUrl: page.url(),
    };

    await page.waitForTimeout(browserSessionWaitMs);

    const results = await Promise.all(
      urls.map((url) =>
        page.evaluate(async (targetUrl: string) => {
          try {
            const response = await fetch(targetUrl, {
              headers: {
                accept: 'application/json,*/*',
              },
            });
            const text = await response.text();

            return {
              url: targetUrl,
              ok: response.ok,
              status: response.status,
              data: text,
              error: response.ok ? undefined : `Provider returned ${response.status}`,
            };
          } catch (error) {
            return {
              url: targetUrl,
              ok: false,
              error: error instanceof Error ? error.message : 'Provider request failed',
            };
          }
        }, url)
      )
    );

    return {
      warmup,
      results: results.map((result) => ({
        ...result,
        data: typeof result.data === 'string' ? parseBrowserResponse(result.data) : result.data,
      })),
    };
  } catch (error) {
    return {
      warmup: {
        url: pageUrl,
        ok: false,
        error: error instanceof Error ? error.message : 'Browser warmup failed',
      },
      results: urls.map((url) => ({
        url,
        ok: false,
        error: 'Browser provider preview did not run',
      })),
    };
  } finally {
    await browser?.close();
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

  const preview = await fetchUrlsFromPageContext(
    parsedBody.data.pageUrl ?? defaultSofaScorePageUrl,
    parsedBody.data.urls
  );

  res.json({
    ok: preview.warmup.ok && preview.results.every((result) => result.ok),
    mode: 'playwright-headless-chromium',
    warmup: preview.warmup,
    results: preview.results,
  });
});

export default adminRouter;
