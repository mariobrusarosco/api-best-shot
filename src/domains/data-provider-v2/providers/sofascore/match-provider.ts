import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import {
  BrowserRequest,
  BrowserRequestTransportError,
} from '@/domains/data-provider-v2/transport/playwright/browser-request';
import { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import { buildSofaScoreMatchEventUrl, buildSofaScoreWarmupUrl } from './endpoints';

export type SofaScoreMatchEvent = {
  id: number;
  slug: string;
  roundInfo: {
    round: number;
  };
  startTimestamp: number | null;
  tournament: {
    uniqueTournament: {
      id: number;
    };
  };
  status: {
    description: string;
    type: string;
    code: number;
  };
  winnerCode: number | null;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    slug: string;
    nameCode: string;
    teamColors: {
      primary: string;
      secondary: string;
      text: string;
    };
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    slug: string;
    nameCode: string;
    teamColors: {
      primary: string;
      secondary: string;
      text: string;
    };
  };
  homeScore: {
    current: number;
    display: number;
    period1: number;
    period2: number;
    normaltime: number;
    penalties: number;
  };
  awayScore: {
    current: number;
    display: number;
    period1: number;
    period2: number;
    normaltime: number;
    penalties: number;
  };
};

export type SofaScoreMatchEventPayload = {
  event?: SofaScoreMatchEvent | null;
};

const SOFASCORE_MATCH_PROVIDER_WARMUP_MARKER = 'sofascore:match-provider:warmed';

export class SofaScoreMatchProvider {
  private readonly session: BrowserSession;
  private readonly browserRequest: BrowserRequest;

  private constructor(session: BrowserSession, browserRequest: BrowserRequest) {
    this.session = session;
    this.browserRequest = browserRequest;
  }

  public static fromSession(session: BrowserSession): SofaScoreMatchProvider {
    return new SofaScoreMatchProvider(session, new BrowserRequest(session));
  }

  public async fetchMatchEvent(input: { matchExternalId: string }): Promise<SofaScoreMatchEventPayload> {
    await this.ensureSessionWarmed();

    const requestUrl = buildSofaScoreMatchEventUrl(input.matchExternalId);

    try {
      const response = await this.browserRequest.fetchJson<SofaScoreMatchEventPayload>({
        url: requestUrl,
      });

      if (!response.ok) {
        throw new ProviderRequestError({
          provider: 'sofascore',
          resource: 'match_event',
          message: `SofaScore match event request returned status ${response.status}`,
          requestUrl,
          requestIdentifier: input.matchExternalId,
          status: response.status,
          responseBodySnippet: response.responseBodySnippet,
        });
      }

      return response.data ?? {};
    } catch (error) {
      if (error instanceof ProviderRequestError) throw error;

      if (error instanceof BrowserRequestTransportError) {
        throw new ProviderRequestError({
          provider: 'sofascore',
          resource: 'match_event',
          message: `SofaScore match event request failed for ${input.matchExternalId}`,
          requestUrl,
          requestIdentifier: input.matchExternalId,
          status: error.status,
          causeMessage: error.causeMessage ?? error.message,
          responseBodySnippet: error.responseBodySnippet,
        });
      }

      throw new ProviderRequestError({
        provider: 'sofascore',
        resource: 'match_event',
        message: `SofaScore match event request failed unexpectedly for ${input.matchExternalId}`,
        requestUrl,
        requestIdentifier: input.matchExternalId,
        causeMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async ensureSessionWarmed(): Promise<void> {
    if (this.session.hasMarker(SOFASCORE_MATCH_PROVIDER_WARMUP_MARKER)) {
      return;
    }

    const warmupUrl = buildSofaScoreWarmupUrl();
    const page = this.session.getPage();

    try {
      await page.goto(warmupUrl, {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });

      this.session.mark(SOFASCORE_MATCH_PROVIDER_WARMUP_MARKER);
    } catch (error) {
      Logger.warn('SofaScore session warm-up failed; continuing with direct event request', {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'provider',
        operation: 'SofaScoreMatchProvider.ensureSessionWarmed',
        warmupUrl,
        causeMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
