import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type { SofaScoreTournamentRoundsPayload } from '@/domains/data-provider-v2/contracts/rounds';
import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import {
  BrowserRequest,
  type BrowserJsonResponse,
  BrowserRequestTransportError,
} from '@/domains/data-provider-v2/transport/playwright/browser-request';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import { buildSofaScoreTournamentRoundsUrl } from './endpoints';

export class SofaScoreRoundProvider {
  private readonly browserRequest: BrowserRequest;
  private readonly tournamentPublicUrl?: string;

  private constructor(input: { browserRequest: BrowserRequest; tournamentPublicUrl?: string }) {
    this.browserRequest = input.browserRequest;
    this.tournamentPublicUrl = input.tournamentPublicUrl?.trim() || undefined;
  }

  public static fromSession(
    session: BrowserSession,
    options?: { tournamentPublicUrl?: string }
  ): SofaScoreRoundProvider {
    return new SofaScoreRoundProvider({
      browserRequest: new BrowserRequest(session),
      tournamentPublicUrl: options?.tournamentPublicUrl,
    });
  }

  public async fetchTournamentRounds(input: { baseUrl: string }): Promise<SofaScoreTournamentRoundsPayload> {
    const requestUrl = buildSofaScoreTournamentRoundsUrl(input.baseUrl);

    try {
      const response = await this.fetchJsonWithWarmup<SofaScoreTournamentRoundsPayload>({
        requestUrl,
        requestIdentifier: input.baseUrl,
        operation: 'SofaScoreRoundProvider.fetchTournamentRounds',
        warningMessage: 'SofaScore tournament warmup failed before retrying rounds request',
      });

      if (!response.ok) {
        throw new ProviderRequestError({
          provider: 'sofascore',
          resource: 'tournament_rounds',
          message: `SofaScore tournament rounds request returned status ${response.status}`,
          requestUrl,
          requestIdentifier: input.baseUrl,
          status: response.status,
          responseBodySnippet: response.responseBodySnippet,
        });
      }

      return response.data ?? { rounds: [] };
    } catch (error) {
      if (error instanceof ProviderRequestError) throw error;

      if (error instanceof BrowserRequestTransportError) {
        throw new ProviderRequestError({
          provider: 'sofascore',
          resource: 'tournament_rounds',
          message: `SofaScore tournament rounds request failed for ${input.baseUrl}`,
          requestUrl,
          requestIdentifier: input.baseUrl,
          status: error.status,
          causeMessage: error.causeMessage ?? error.message,
          responseBodySnippet: error.responseBodySnippet,
        });
      }

      throw new ProviderRequestError({
        provider: 'sofascore',
        resource: 'tournament_rounds',
        message: `SofaScore tournament rounds request failed unexpectedly for ${input.baseUrl}`,
        requestUrl,
        requestIdentifier: input.baseUrl,
        causeMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public async fetchTournamentRound<TPayload extends { events: unknown[] }>(input: {
    providerUrl: string;
  }): Promise<TPayload> {
    const requestUrl = input.providerUrl.trim();

    try {
      const response = await this.fetchJsonWithWarmup<TPayload>({
        requestUrl,
        requestIdentifier: requestUrl,
        operation: 'SofaScoreRoundProvider.fetchTournamentRound',
        warningMessage: 'SofaScore tournament warmup failed before retrying round request',
      });

      if (!response.ok) {
        throw new ProviderRequestError({
          provider: 'sofascore',
          resource: 'tournament_round',
          message: `SofaScore tournament round request returned status ${response.status}`,
          requestUrl,
          requestIdentifier: requestUrl,
          status: response.status,
          responseBodySnippet: response.responseBodySnippet,
        });
      }

      return response.data ?? ({ events: [] } as unknown as TPayload);
    } catch (error) {
      if (error instanceof ProviderRequestError) throw error;

      if (error instanceof BrowserRequestTransportError) {
        throw new ProviderRequestError({
          provider: 'sofascore',
          resource: 'tournament_round',
          message: `SofaScore tournament round request failed for ${requestUrl}`,
          requestUrl,
          requestIdentifier: requestUrl,
          status: error.status,
          causeMessage: error.causeMessage ?? error.message,
          responseBodySnippet: error.responseBodySnippet,
        });
      }

      throw new ProviderRequestError({
        provider: 'sofascore',
        resource: 'tournament_round',
        message: `SofaScore tournament round request failed unexpectedly for ${requestUrl}`,
        requestUrl,
        requestIdentifier: requestUrl,
        causeMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async fetchJsonWithWarmup<TPayload>(input: {
    requestUrl: string;
    requestIdentifier: string;
    operation: string;
    warningMessage: string;
  }): Promise<BrowserJsonResponse<TPayload>> {
    const firstResponse = await this.browserRequest.fetchJson<TPayload>(input.requestUrl);

    if (firstResponse.status !== 403) {
      return firstResponse;
    }

    const secondResponse = await this.browserRequest.fetchJson<TPayload>(input.requestUrl);

    if (secondResponse.status !== 403 || !this.tournamentPublicUrl) {
      return secondResponse;
    }

    try {
      await this.browserRequest.navigate({
        url: this.tournamentPublicUrl,
        waitUntil: 'load',
      });
    } catch (error) {
      Logger.warn(input.warningMessage, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'providers',
        operation: input.operation,
        requestUrl: input.requestUrl,
        requestIdentifier: input.requestIdentifier,
        tournamentPublicUrl: this.tournamentPublicUrl,
        causeMessage: error instanceof Error ? error.message : String(error),
      });
    }

    return this.browserRequest.fetchJson<TPayload>(input.requestUrl);
  }
}
