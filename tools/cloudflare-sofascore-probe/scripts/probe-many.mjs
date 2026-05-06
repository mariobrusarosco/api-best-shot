import { existsSync, readFileSync } from 'node:fs';

loadDotEnvIfPresent();

const probeUrl = requireEnv('PROBE_URL');
const probeToken = requireEnv('PROBE_TOKEN');
const warmupUrl = requireEnv('WARMUP_URL');
const jsonUrl = requireEnv('JSON_URL');
const attempts = parsePositiveInteger(process.env.ATTEMPTS, 50);
const waitMs = parseNonNegativeInteger(process.env.WAIT_MS, 1000);

const results = [];

for (let index = 0; index < attempts; index++) {
  const requestId = `probe-${new Date().toISOString()}-${index + 1}`;
  const startedAt = Date.now();

  try {
    const response = await fetch(probeUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${probeToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        warmupUrl,
        jsonUrl,
      }),
    });
    const body = await response.json();
    const durationMs = Date.now() - startedAt;

    results.push({
      ok: response.ok && body.ok === true,
      httpStatus: response.status,
      providerStatus: body.fetch?.status ?? null,
      challengeDetected: body.fetch?.challengeDetected === true || body.warmup?.challengeDetected === true,
      durationMs,
      errorMessage: body.error?.message,
    });

    console.log(
      JSON.stringify({
        attempt: index + 1,
        ok: response.ok && body.ok === true,
        httpStatus: response.status,
        providerStatus: body.fetch?.status ?? null,
        challengeDetected: body.fetch?.challengeDetected === true || body.warmup?.challengeDetected === true,
        durationMs,
      })
    );
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    results.push({
      ok: false,
      httpStatus: null,
      providerStatus: null,
      challengeDetected: false,
      durationMs,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    console.log(
      JSON.stringify({
        attempt: index + 1,
        ok: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs,
      })
    );
  }

  if (index < attempts - 1 && waitMs > 0) {
    await wait(waitMs);
  }
}

const durations = results.map(result => result.durationMs).sort((left, right) => left - right);
const summary = {
  attempts,
  ok: results.filter(result => result.ok).length,
  provider403: results.filter(result => result.providerStatus === 403).length,
  challengeDetected: results.filter(result => result.challengeDetected).length,
  workerHttpFailures: results.filter(result => typeof result.httpStatus === 'number' && result.httpStatus >= 400).length,
  networkFailures: results.filter(result => result.httpStatus === null).length,
  medianDurationMs: percentile(durations, 0.5),
  p95DurationMs: percentile(durations, 0.95),
};

console.log(JSON.stringify({ summary }, null, 2));

function loadDotEnvIfPresent() {
  if (!existsSync('.env')) {
    return;
  }

  const content = readFileSync('.env', 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function percentile(values, ratio) {
  if (values.length === 0) {
    return null;
  }

  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * ratio) - 1));

  return values[index];
}

function wait(durationMs) {
  return new Promise(resolve => setTimeout(resolve, durationMs));
}
