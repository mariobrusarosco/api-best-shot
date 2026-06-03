const SOFASCORE_HOSTS = new Set(['www.sofascore.com', 'api.sofascore.com', 'img.sofascore.com']);
const DEFAULT_WAIT_MS = 11_000;
const DEFAULT_ATTEMPTS = 1;
const DEFAULT_GOTO_WAIT_UNTIL = 'domcontentloaded';
const DEFAULT_GOTO_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID');
const apiToken = requiredEnv('CLOUDFLARE_API_TOKEN');
const sofaScoreJsonUrl = requiredEnv('SOFASCORE_JSON_URL');

assertAllowedSofaScoreUrl(sofaScoreJsonUrl, 'SOFASCORE_JSON_URL');

const attempts = positiveIntegerFromEnv('ATTEMPTS', DEFAULT_ATTEMPTS);
const waitMs = nonNegativeIntegerFromEnv('WAIT_MS', DEFAULT_WAIT_MS);
const gotoWaitUntil = process.env.GOTO_WAIT_UNTIL?.trim() || DEFAULT_GOTO_WAIT_UNTIL;
const gotoTimeoutMs = positiveIntegerFromEnv('GOTO_TIMEOUT_MS', DEFAULT_GOTO_TIMEOUT_MS);
const userAgent = process.env.USER_AGENT?.trim() || DEFAULT_USER_AGENT;

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/content`;
const startedAt = new Date();
const results = [];

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const result = await probeContentEndpoint({
    attempt,
    endpoint,
    url: sofaScoreJsonUrl,
    gotoWaitUntil,
    gotoTimeoutMs,
    userAgent,
  });

  results.push(result);
  printAttempt(result);

  if (attempt < attempts) {
    const retryAfterMs = retryAfterToMs(result.headers.retryAfter);
    await wait(Math.max(waitMs, retryAfterMs));
  }
}

const completedAt = new Date();
const summary = buildSummary({ startedAt, completedAt, results, url: sofaScoreJsonUrl });

console.log(JSON.stringify(summary, null, 2));

async function probeContentEndpoint({ attempt, endpoint, url, gotoWaitUntil, gotoTimeoutMs, userAgent }) {
  const startedAt = new Date();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      url,
      userAgent,
      gotoOptions: {
        waitUntil: gotoWaitUntil,
        timeout: gotoTimeoutMs,
      },
    }),
  });

  const bodyText = await response.text();
  const completedAt = new Date();
  const contentAnalysis = analyzeContent(bodyText);

  return {
    attempt,
    ok: response.ok && contentAnalysis.sofaScoreJsonDetected && !contentAnalysis.challengeDetected,
    httpStatus: response.status,
    headers: {
      contentType: response.headers.get('content-type'),
      xBrowserMsUsed: response.headers.get('x-browser-ms-used'),
      retryAfter: response.headers.get('retry-after'),
    },
    content: contentAnalysis,
    timings: buildTimings(startedAt, completedAt),
  };
}

function analyzeContent(bodyText) {
  const bodySnippet = bodyText.slice(0, 1500);
  const extractedText = extractLikelyBodyText(bodyText);
  const parsedJson = parseJsonOrNull(extractedText);
  const parsedTopLevelKeys = parsedJson && typeof parsedJson === 'object' ? Object.keys(parsedJson).slice(0, 20) : [];
  const cloudflareEnvelopeDetected =
    parsedTopLevelKeys.includes('success') &&
    parsedTopLevelKeys.includes('errors') &&
    parsedTopLevelKeys.includes('messages') &&
    parsedTopLevelKeys.includes('result');
  const parseableJsonDetected = Boolean(parsedJson && typeof parsedJson === 'object' && !cloudflareEnvelopeDetected);

  return {
    bodyBytes: Buffer.byteLength(bodyText, 'utf8'),
    extractedTextBytes: Buffer.byteLength(extractedText, 'utf8'),
    bodyShape: detectBodyShape(bodyText, extractedText),
    challengeDetected: isChallenge(bodyText) || isChallenge(extractedText),
    parseableJsonDetected,
    sofaScoreJsonDetected: parseableJsonDetected,
    cloudflareEnvelopeDetected,
    parsedTopLevelKeys,
    bodySnippet,
    extractedTextSnippet: extractedText.slice(0, 1500),
  };
}

function extractLikelyBodyText(bodyText) {
  const trimmed = bodyText.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const cloudflareEnvelope = parseJsonOrNull(trimmed);
    if (cloudflareEnvelope?.result && typeof cloudflareEnvelope.result === 'string') {
      return extractLikelyBodyText(cloudflareEnvelope.result);
    }

    return trimmed;
  }

  const preMatch = trimmed.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);

  if (preMatch?.[1]) {
    return decodeHtmlEntities(stripTags(preMatch[1]).trim());
  }

  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (bodyMatch?.[1]) {
    return decodeHtmlEntities(stripTags(bodyMatch[1]).trim());
  }

  return decodeHtmlEntities(stripTags(trimmed).trim());
}

function detectBodyShape(bodyText, extractedText) {
  const trimmed = bodyText.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = parseJsonOrNull(trimmed);
    if (parsed?.result && typeof parsed.result === 'string') {
      return 'cloudflare-json-envelope';
    }

    return 'raw-json';
  }

  if (/<pre[^>]*>/i.test(bodyText) && parseJsonOrNull(extractedText)) {
    return 'html-pre-json';
  }

  if (/<html[\s>]/i.test(bodyText)) {
    return 'html';
  }

  return 'text';
}

function parseJsonOrNull(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isChallenge(value) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('just a moment') ||
    normalized.includes('cf-chl') ||
    normalized.includes('challenge-platform') ||
    normalized.includes('checking your browser') ||
    normalized.includes('cloudflare ray id')
  );
}

function stripTags(value) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '');
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function printAttempt(result) {
  const browserMs = result.headers.xBrowserMsUsed ?? 'n/a';
  const retryAfter = result.headers.retryAfter ? ` retryAfter=${result.headers.retryAfter}s` : '';

  console.error(
    [
      `attempt=${result.attempt}`,
      `http=${result.httpStatus}`,
      `ok=${result.ok}`,
      `shape=${result.content.bodyShape}`,
      `sofaJson=${result.content.sofaScoreJsonDetected}`,
      `challenge=${result.content.challengeDetected}`,
      `browserMs=${browserMs}`,
      `durationMs=${result.timings.durationMs}`,
      retryAfter,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function buildSummary({ startedAt, completedAt, results, url }) {
  const successful = results.filter(result => result.ok).length;
  const rateLimited = results.filter(result => result.httpStatus === 429).length;
  const challenged = results.filter(result => result.content.challengeDetected).length;
  const sofaScoreJsonDetected = results.filter(result => result.content.sofaScoreJsonDetected).length;
  const browserMsUsed = results.reduce((total, result) => total + Number(result.headers.xBrowserMsUsed ?? 0), 0);

  return {
    ok: successful === results.length,
    url,
    totals: {
      attempts: results.length,
      successful,
      sofaScoreJsonDetected,
      challenged,
      rateLimited,
      browserMsUsed,
    },
    timings: buildTimings(startedAt, completedAt),
    results,
  };
}

function retryAfterToMs(value) {
  if (!value) {
    return 0;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(value);

  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return 0;
}

function buildTimings(startedAt, completedAt) {
  return {
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value || value.startsWith('replace-with-')) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function positiveIntegerFromEnv(name, fallback) {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function nonNegativeIntegerFromEnv(name, fallback) {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return parsed;
}

function assertAllowedSofaScoreUrl(value, envName) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${envName} must be a valid URL`);
  }

  if (parsed.protocol !== 'https:' || !SOFASCORE_HOSTS.has(parsed.hostname)) {
    throw new Error(`${envName} must be an allowed SofaScore HTTPS URL`);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
