import { BrowserSession } from './browser-session';

const RESPONSE_BODY_SNIPPET_MAX_LENGTH = 1_000;

export type BrowserJsonRequestInput = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
};

export type BrowserJsonResponse<TData> = {
  ok: boolean;
  status: number;
  requestUrl: string;
  responseUrl: string;
  data: TData | null;
  responseBodySnippet?: string;
};

type BrowserEvaluateResponse<TData> =
  | {
      kind: 'response';
      ok: boolean;
      status: number;
      requestUrl: string;
      responseUrl: string;
      data: TData | null;
      responseBodySnippet?: string;
    }
  | {
      kind: 'request_error';
      requestUrl: string;
      errorMessage: string;
    }
  | {
      kind: 'invalid_json';
      requestUrl: string;
      status: number;
      responseUrl: string;
      responseBodySnippet?: string;
      errorMessage: string;
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

  public async fetchJson<TData>(input: BrowserJsonRequestInput): Promise<BrowserJsonResponse<TData>> {
    const page = this.session.getPage();
    const requestHeaders = buildRequestHeaders(input.headers, input.body);

    const result = await page.evaluate<
      BrowserEvaluateResponse<TData>,
      {
        url: string;
        method: string;
        headers?: Record<string, string>;
        serializedBody?: string;
        maxSnippetLength: number;
      }
    >(
      async request => {
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.serializedBody,
          });

          const responseText = await response.text();
          const responseBodySnippet =
            responseText.length > 0 ? responseText.slice(0, request.maxSnippetLength) : undefined;

          if (!response.ok) {
            return {
              kind: 'response',
              ok: false,
              status: response.status,
              requestUrl: request.url,
              responseUrl: response.url,
              data: safeParseJson<TData>(responseText),
              responseBodySnippet,
            };
          }

          if (!responseText) {
            return {
              kind: 'response',
              ok: true,
              status: response.status,
              requestUrl: request.url,
              responseUrl: response.url,
              data: null,
              responseBodySnippet,
            };
          }

          try {
            return {
              kind: 'response',
              ok: true,
              status: response.status,
              requestUrl: request.url,
              responseUrl: response.url,
              data: JSON.parse(responseText) as TData,
              responseBodySnippet,
            };
          } catch (error) {
            return {
              kind: 'invalid_json',
              requestUrl: request.url,
              responseUrl: response.url,
              status: response.status,
              responseBodySnippet,
              errorMessage: error instanceof Error ? error.message : String(error),
            };
          }
        } catch (error) {
          return {
            kind: 'request_error',
            requestUrl: request.url,
            errorMessage: error instanceof Error ? error.message : String(error),
          };
        }
      },
      {
        url: input.url,
        method: input.method ?? 'GET',
        headers: requestHeaders,
        serializedBody: serializeRequestBody(input.body),
        maxSnippetLength: RESPONSE_BODY_SNIPPET_MAX_LENGTH,
      }
    );

    if (result.kind === 'request_error') {
      throw new BrowserRequestTransportError({
        message: `Browser-context request failed for URL: ${result.requestUrl}`,
        requestUrl: result.requestUrl,
        causeMessage: result.errorMessage,
      });
    }

    if (result.kind === 'invalid_json') {
      throw new BrowserRequestTransportError({
        message: `Browser-context JSON request returned invalid JSON for URL: ${result.requestUrl}`,
        requestUrl: result.requestUrl,
        status: result.status,
        responseUrl: result.responseUrl,
        causeMessage: result.errorMessage,
        responseBodySnippet: result.responseBodySnippet,
      });
    }

    return result;
  }
}

const buildRequestHeaders = (
  headers: Record<string, string> | undefined,
  body: unknown
): Record<string, string> | undefined => {
  if (!headers && body === undefined) {
    return undefined;
  }

  const normalizedHeaders: Record<string, string> = { ...(headers ?? {}) };

  if (body !== undefined && !hasHeader(normalizedHeaders, 'content-type')) {
    normalizedHeaders['content-type'] = 'application/json';
  }

  return normalizedHeaders;
};

const hasHeader = (headers: Record<string, string>, headerName: string): boolean => {
  const normalizedName = headerName.toLowerCase();

  return Object.keys(headers).some(key => key.toLowerCase() === normalizedName);
};

const serializeRequestBody = (body: unknown): string | undefined => {
  if (body === undefined) {
    return undefined;
  }

  if (typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body);
};

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
