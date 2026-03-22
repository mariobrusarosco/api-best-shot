import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import {
  BrowserRequest,
  BrowserRequestTransportError,
} from '@/domains/data-provider-v2/transport/playwright/browser-request';
import { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import { buildSofaScoreMatchEventUrl } from './endpoints';

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

export class SofaScoreMatchProvider {
  private readonly browserRequest: BrowserRequest;

  private constructor(browserRequest: BrowserRequest) {
    this.browserRequest = browserRequest;
  }

  public static fromSession(session: BrowserSession): SofaScoreMatchProvider {
    return new SofaScoreMatchProvider(new BrowserRequest(session));
  }

  public async fetchMatchEvent(input: { matchExternalId: string }): Promise<SofaScoreMatchEventPayload> {
    const requestUrl = buildSofaScoreMatchEventUrl(input.matchExternalId);

    try {
      const response = await this.browserRequest.fetchJson<SofaScoreMatchEventPayload>(requestUrl);

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
}
