import type { SofaScoreTournamentRoundsPayload } from '@/domains/data-provider-v2/contracts/rounds';
import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import {
  BrowserRequest,
  BrowserRequestTransportError,
} from '@/domains/data-provider-v2/transport/playwright/browser-request';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import { buildSofaScoreTournamentRoundsUrl } from './endpoints';

export class SofaScoreRoundProvider {
  private readonly browserRequest: BrowserRequest;

  private constructor(browserRequest: BrowserRequest) {
    this.browserRequest = browserRequest;
  }

  public static fromSession(session: BrowserSession): SofaScoreRoundProvider {
    return new SofaScoreRoundProvider(new BrowserRequest(session));
  }

  public async fetchTournamentRounds(input: { baseUrl: string }): Promise<SofaScoreTournamentRoundsPayload> {
    const requestUrl = buildSofaScoreTournamentRoundsUrl(input.baseUrl);

    try {
      const response = await this.browserRequest.fetchJson<SofaScoreTournamentRoundsPayload>(requestUrl);

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
      const response = await this.browserRequest.fetchJson<TPayload>(requestUrl);

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
}
