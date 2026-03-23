import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import {
  BrowserRequest,
  type BrowserJsonResponse,
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
  private readonly tournamentPublicUrl?: string;

  private constructor(input: { browserRequest: BrowserRequest; tournamentPublicUrl?: string }) {
    this.browserRequest = input.browserRequest;
    this.tournamentPublicUrl = input.tournamentPublicUrl?.trim() || undefined;
  }

  public static fromSession(
    session: BrowserSession,
    options?: { tournamentPublicUrl?: string }
  ): SofaScoreMatchProvider {
    return new SofaScoreMatchProvider({
      browserRequest: new BrowserRequest(session),
      tournamentPublicUrl: options?.tournamentPublicUrl,
    });
  }

  public async fetchMatchEvent(input: { matchExternalId: string }): Promise<SofaScoreMatchEventPayload> {
    const requestUrl = buildSofaScoreMatchEventUrl(input.matchExternalId);

    try {
      const response = await this.fetchMatchEventResponse({
        matchExternalId: input.matchExternalId,
        requestUrl,
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

  private async fetchMatchEventResponse(input: {
    matchExternalId: string;
    requestUrl: string;
  }): Promise<BrowserJsonResponse<SofaScoreMatchEventPayload>> {
    const response = await this.browserRequest.fetchJson<SofaScoreMatchEventPayload>(input.requestUrl);

    if (!shouldRecoverFromChallenge(response) || !this.tournamentPublicUrl) {
      return response;
    }

    await this.warmTournamentContext({
      matchExternalId: input.matchExternalId,
      requestUrl: input.requestUrl,
    });

    return this.browserRequest.fetchJson<SofaScoreMatchEventPayload>(input.requestUrl);
  }

  private async warmTournamentContext(input: { matchExternalId: string; requestUrl: string }): Promise<void> {
    const tournamentPublicUrl = this.tournamentPublicUrl;

    if (!tournamentPublicUrl) {
      return;
    }

    try {
      await this.browserRequest.navigate({
        url: tournamentPublicUrl,
        waitUntil: 'load',
      });
    } catch (error) {
      Logger.warn('SofaScore tournament warmup failed before retrying challenged match event request', {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'providers',
        operation: 'SofaScoreMatchProvider.warmTournamentContext',
        requestUrl: input.requestUrl,
        requestIdentifier: input.matchExternalId,
        tournamentPublicUrl,
        causeMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

const shouldRecoverFromChallenge = (response: BrowserJsonResponse<unknown>): boolean => {
  return response.status === 403 && response.responseBodySnippet?.toLowerCase().includes('challenge') === true;
};
