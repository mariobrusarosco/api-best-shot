import type { Response } from 'playwright';
import type { BrowserSession } from './browser-session';

const RESPONSE_BODY_SNIPPET_MAX_LENGTH = 1_000;
const CHALLENGE_RETRY_DELAY_MS = 500;

export type BrowserJsonRequestInput = {
  url: string;
};

export type BrowserJsonResponse<TData> = {
  ok: boolean;
  status: number;
  requestUrl: string;
  responseUrl: string;
  data: TData | null;
  responseBodySnippet?: string;
};

export class BrowserRequestTransportError extends Error {
  public readonly requestUrl: string;
  public readonly status?: number;
  public readonly responseUrl?: string;
  public readonly causeMessage?: string;
  public readonly responseBodySnippet?: string;

  constructor(props: {
    message: string;
    requestUrl: string;
    status?: number;
    responseUrl?: string;
    causeMessage?: string;
    responseBodySnippet?: string;
  }) {
    super(props.message);
    this.name = 'BrowserRequestTransportError';
    this.requestUrl = props.requestUrl;
    this.status = props.status;
    this.responseUrl = props.responseUrl;
    this.causeMessage = props.causeMessage;
    this.responseBodySnippet = props.responseBodySnippet;
  }
}

export class BrowserRequest {
  constructor(private readonly session: BrowserSession) {}

  public async fetchJson<TData>(url: string): Promise<BrowserJsonResponse<TData>> {
    const page = this.session.getPage();

    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response | null = null;

      try {
        response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
      } catch (error) {
        throw new BrowserRequestTransportError({
          message: `Browser page navigation failed for URL: ${url}`,
          requestUrl: url,
          causeMessage: error instanceof Error ? error.message : String(error),
        });
      }

      if (!response) {
        throw new BrowserRequestTransportError({
          message: `Browser page navigation returned no response for URL: ${url}`,
          requestUrl: url,
        });
      }

      const responseText = await page.evaluate(() => {
        const pre = document.querySelector('pre');
        return pre ? pre.textContent ?? '' : document.body.textContent ?? '';
      });

      const responseBodySnippet =
        responseText.length > 0 ? responseText.slice(0, RESPONSE_BODY_SNIPPET_MAX_LENGTH) : undefined;

      if (shouldRetryChallengeResponse(response.status(), responseBodySnippet) && attempt === 0) {
        await page.waitForTimeout(CHALLENGE_RETRY_DELAY_MS);
        continue;
      }

      if (!response.ok()) {
        return {
          ok: false,
          status: response.status(),
          requestUrl: url,
          responseUrl: response.url(),
          data: safeParseJson<TData>(responseText),
          responseBodySnippet,
        };
      }

      if (!responseText) {
        return {
          ok: true,
          status: response.status(),
          requestUrl: url,
          responseUrl: response.url(),
          data: null,
          responseBodySnippet,
        };
      }

      let data: TData;

      try {
        data = JSON.parse(responseText) as TData;
      } catch (error) {
        throw new BrowserRequestTransportError({
          message: `Browser page JSON request returned invalid JSON for URL: ${url}`,
          requestUrl: url,
          status: response.status(),
          responseUrl: response.url(),
          causeMessage: error instanceof Error ? error.message : String(error),
          responseBodySnippet,
        });
      }

      return {
        ok: true,
        status: response.status(),
        requestUrl: url,
        responseUrl: response.url(),
        data,
        responseBodySnippet,
      };
    }

    throw new BrowserRequestTransportError({
      message: `Browser page JSON request exhausted retries for URL: ${url}`,
      requestUrl: url,
    });
  }
}

const safeParseJson = <TData>(value: string): TData | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as TData;
  } catch {
    return null;
  }
};

const shouldRetryChallengeResponse = (status: number, responseBodySnippet?: string): boolean => {
  if (status !== 403 || !responseBodySnippet) {
    return false;
  }

  return responseBodySnippet.includes('"reason"') && responseBodySnippet.toLowerCase().includes('challenge');
};
