import { launch } from '@cloudflare/playwright';

type MinimalBrowser = {
  newContext(options: {
    userAgent: string;
    viewport: { width: number; height: number };
    ignoreHTTPSErrors: boolean;
  }): Promise<MinimalBrowserContext>;
  close(): Promise<void>;
};

type MinimalBrowserContext = {
  newPage(): Promise<MinimalPage>;
};

type MinimalPage = {
  setDefaultTimeout(timeout: number): void;
  setDefaultNavigationTimeout(timeout: number): void;
  goto(
    url: string,
    options: {
      waitUntil: 'load' | 'domcontentloaded';
      timeout: number;
    }
  ): Promise<MinimalResponse | null>;
  evaluate<T>(fn: () => T): Promise<T>;
};

type MinimalResponse = {
  ok(): boolean;
  status(): number;
  url(): string;
  headers(): Record<string, string>;
};

type ProbeRequestBody = {
  requestId?: unknown;
  warmupUrl?: unknown;
  jsonUrl?: unknown;
  waitAfterWarmupMs?: unknown;
};

type ProbeNavigationResult = {
  ok: boolean;
  status: number | null;
  requestUrl: string;
  responseUrl: string | null;
  bodySnippet?: string;
  contentType?: string;
  challengeDetected: boolean;
};

type ProbeErrorStage = 'auth' | 'validation' | 'warmup' | 'fetch' | 'parse' | 'unexpected';

const DEFAULT_WAIT_AFTER_WARMUP_MS = 1500;
const MAX_WAIT_AFTER_WARMUP_MS = 10_000;
const BODY_SNIPPET_MAX_LENGTH = 1500;
const SOFASCORE_HOSTS = new Set(['www.sofascore.com', 'api.sofascore.com', 'img.sofascore.com']);
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startedAt = new Date();

    if (request.method === 'GET') {
      return jsonResponse({
        status: 'ok',
        service: 'cloudflare-sofascore-probe',
      });
    }

    const url = new URL(request.url);

    if (url.pathname !== '/fetch-json') {
      return errorResponse({
        status: 404,
        startedAt,
        stage: 'validation',
        message: 'Route not found',
      });
    }

    if (request.method !== 'POST') {
      return errorResponse({
        status: 405,
        startedAt,
        stage: 'validation',
        message: 'Only POST requests are supported',
      });
    }

    if (!isAuthorized(request, env)) {
      return errorResponse({
        status: 401,
        startedAt,
        stage: 'auth',
        message: 'Unauthorized',
      });
    }

    let body: ProbeRequestBody;

    try {
      body = (await request.json()) as ProbeRequestBody;
    } catch (error) {
      return errorResponse({
        status: 400,
        startedAt,
        stage: 'validation',
        message: 'Request body must be valid JSON',
        causeMessage: error instanceof Error ? error.message : String(error),
      });
    }

    const validation = validateProbeBody(body);

    if (!validation.ok) {
      return errorResponse({
        status: 400,
        startedAt,
        stage: 'validation',
        message: validation.message,
      });
    }

    let browser: MinimalBrowser | null = null;

    try {
      browser = (await launch(env.MYBROWSER)) as MinimalBrowser;
      const context = await browser.newContext({
        userAgent: DEFAULT_USER_AGENT,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(30_000);
      page.setDefaultNavigationTimeout(30_000);

      const warmup = await navigateAndRead({
        page,
        url: validation.warmupUrl,
        waitUntil: 'load',
      });

      await wait(validation.waitAfterWarmupMs);

      const fetch = await navigateAndRead({
        page,
        url: validation.jsonUrl,
        waitUntil: 'domcontentloaded',
      });

      const parsedJson = parseJsonOrNull(fetch.bodySnippet);
      const completedAt = new Date();

      return jsonResponse({
        ok: fetch.ok,
        requestId: validation.requestId,
        warmup,
        fetch,
        parsedJson,
        timings: buildTimings(startedAt, completedAt),
      });
    } catch (error) {
      return errorResponse({
        status: 500,
        startedAt,
        stage: 'unexpected',
        message: 'Unexpected Cloudflare Browser Run probe failure',
        causeMessage: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await browser?.close().catch(() => undefined);
    }
  },
};

const isAuthorized = (request: Request, env: Env): boolean => {
  const configuredToken = env.PROBE_TOKEN?.trim();

  if (!configuredToken) {
    return false;
  }

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();

  return token === configuredToken;
};

const validateProbeBody = (
  body: ProbeRequestBody
):
  | {
      ok: true;
      requestId?: string;
      warmupUrl: string;
      jsonUrl: string;
      waitAfterWarmupMs: number;
    }
  | {
      ok: false;
      message: string;
    } => {
  const requestId = typeof body.requestId === 'string' && body.requestId.trim() ? body.requestId.trim() : undefined;
  const warmupUrl = typeof body.warmupUrl === 'string' ? body.warmupUrl.trim() : '';
  const jsonUrl = typeof body.jsonUrl === 'string' ? body.jsonUrl.trim() : '';
  const waitAfterWarmupMs = normalizeWaitAfterWarmupMs(body.waitAfterWarmupMs);

  if (!warmupUrl) {
    return { ok: false, message: 'warmupUrl is required' };
  }

  if (!jsonUrl) {
    return { ok: false, message: 'jsonUrl is required' };
  }

  if (!isAllowedSofaScoreUrl(warmupUrl)) {
    return { ok: false, message: 'warmupUrl must be an allowed SofaScore URL' };
  }

  if (!isAllowedSofaScoreUrl(jsonUrl)) {
    return { ok: false, message: 'jsonUrl must be an allowed SofaScore URL' };
  }

  return {
    ok: true,
    requestId,
    warmupUrl,
    jsonUrl,
    waitAfterWarmupMs,
  };
};

const normalizeWaitAfterWarmupMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_WAIT_AFTER_WARMUP_MS;
  }

  return Math.min(Math.max(Math.round(value), 0), MAX_WAIT_AFTER_WARMUP_MS);
};

const isAllowedSofaScoreUrl = (value: string): boolean => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return url.protocol === 'https:' && SOFASCORE_HOSTS.has(url.hostname);
};

const navigateAndRead = async (input: {
  page: MinimalPage;
  url: string;
  waitUntil: 'load' | 'domcontentloaded';
}): Promise<ProbeNavigationResult> => {
  const response = await input.page.goto(input.url, {
    waitUntil: input.waitUntil,
    timeout: 30_000,
  });
  const bodyText = await input.page.evaluate(() => {
    const doc = (
      globalThis as unknown as {
        document: {
          querySelector(selector: string): { textContent: string | null } | null;
          body: { textContent: string | null };
        };
      }
    ).document;
    const pre = doc.querySelector('pre');

    return pre ? pre.textContent ?? '' : doc.body.textContent ?? '';
  });
  const bodySnippet = bodyText ? bodyText.slice(0, BODY_SNIPPET_MAX_LENGTH) : undefined;
  const contentType = response?.headers()['content-type'];

  return {
    ok: response?.ok() ?? false,
    status: response?.status() ?? null,
    requestUrl: input.url,
    responseUrl: response?.url() ?? null,
    bodySnippet,
    contentType,
    challengeDetected: detectChallenge(bodySnippet),
  };
};

const parseJsonOrNull = (value: string | undefined): unknown => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const detectChallenge = (bodySnippet: string | undefined): boolean => {
  if (!bodySnippet) {
    return false;
  }

  const normalized = bodySnippet.toLowerCase();

  return normalized.includes('challenge') || normalized.includes('cf-chl') || normalized.includes('checking your browser');
};

const wait = (durationMs: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, durationMs));
};

const errorResponse = (input: {
  status: number;
  startedAt: Date;
  stage: ProbeErrorStage;
  message: string;
  causeMessage?: string;
}): Response => {
  const completedAt = new Date();

  return jsonResponse(
    {
      ok: false,
      error: {
        stage: input.stage,
        message: input.message,
        causeMessage: input.causeMessage,
      },
      timings: buildTimings(input.startedAt, completedAt),
    },
    input.status
  );
};

const buildTimings = (startedAt: Date, completedAt: Date) => {
  return {
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
};

const jsonResponse = (body: unknown, status = 200): Response => {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
};
