import type { SofaScoreRoundPayload } from '@/domains/data-provider-v2/contracts/teams';
import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import {
  BrowserRequest,
  BrowserRequestTransportError,
} from '@/domains/data-provider-v2/transport/playwright/browser-request';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';

export class SofaScoreRoundProvider {
  private readonly browserRequest: BrowserRequest;

  private constructor(browserRequest: BrowserRequest) {
    this.browserRequest = browserRequest;
  }

  public static fromSession(session: BrowserSession): SofaScoreRoundProvider {
    return new SofaScoreRoundProvider(new BrowserRequest(session));
  }

  public async fetchTournamentRound(input: { providerUrl: string }): Promise<SofaScoreRoundPayload> {
    const requestUrl = input.providerUrl.trim();

    try {
      const response = await this.browserRequest.fetchJson<SofaScoreRoundPayload>(requestUrl);

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

      return response.data ?? { events: [] };
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
