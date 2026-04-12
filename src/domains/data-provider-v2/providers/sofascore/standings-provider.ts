import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import type {
  SofaScoreStandingsPayload,
  SofaScoreTournamentTeamEventsPayload,
} from '@/domains/data-provider-v2/contracts/standings';
import {
  BrowserRequest,
  BrowserRequestTransportError,
} from '@/domains/data-provider-v2/transport/playwright/browser-request';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import { buildSofaScoreTournamentStandingsUrl, buildSofaScoreTournamentTeamEventsUrl } from './endpoints';

export class SofaScoreStandingsProvider {
  private readonly browserRequest: BrowserRequest;

  private constructor(browserRequest: BrowserRequest) {
    this.browserRequest = browserRequest;
  }

  public static fromSession(session: BrowserSession): SofaScoreStandingsProvider {
    return new SofaScoreStandingsProvider(new BrowserRequest(session));
  }

  public async fetchTournamentStandings(input: { baseUrl: string }): Promise<SofaScoreStandingsPayload> {
    const requestUrl = buildSofaScoreTournamentStandingsUrl(input.baseUrl);

    try {
      const response = await this.browserRequest.fetchJson<SofaScoreStandingsPayload>(requestUrl);

      if (!response.ok) {
        throw new ProviderRequestError({
          provider: 'sofascore',
          resource: 'tournament_standings',
          message: `SofaScore tournament standings request returned status ${response.status}`,
          requestUrl,
          requestIdentifier: input.baseUrl,
          status: response.status,
          responseBodySnippet: response.responseBodySnippet,
        });
      }

      return response.data ?? { standings: [] };
    } catch (error) {
      if (error instanceof ProviderRequestError) throw error;

      if (error instanceof BrowserRequestTransportError) {
        throw new ProviderRequestError({
          provider: 'sofascore',
          resource: 'tournament_standings',
          message: `SofaScore tournament standings request failed for ${input.baseUrl}`,
          requestUrl,
          requestIdentifier: input.baseUrl,
          status: error.status,
          causeMessage: error.causeMessage ?? error.message,
          responseBodySnippet: error.responseBodySnippet,
        });
      }

      throw new ProviderRequestError({
        provider: 'sofascore',
        resource: 'tournament_standings',
        message: `SofaScore tournament standings request failed unexpectedly for ${input.baseUrl}`,
        requestUrl,
        requestIdentifier: input.baseUrl,
        causeMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public async fetchTournamentTeamEvents(input: { baseUrl: string }): Promise<SofaScoreTournamentTeamEventsPayload> {
    const requestUrl = buildSofaScoreTournamentTeamEventsUrl(input.baseUrl);

    try {
      const response = await this.browserRequest.fetchJson<SofaScoreTournamentTeamEventsPayload>(requestUrl);

      if (!response.ok) {
        throw new ProviderRequestError({
          provider: 'sofascore',
          resource: 'tournament_team_events',
          message: `SofaScore tournament team events request returned status ${response.status}`,
          requestUrl,
          requestIdentifier: input.baseUrl,
          status: response.status,
          responseBodySnippet: response.responseBodySnippet,
        });
      }

      return response.data ?? { tournamentTeamEvents: {} };
    } catch (error) {
      if (error instanceof ProviderRequestError) throw error;

      if (error instanceof BrowserRequestTransportError) {
        throw new ProviderRequestError({
          provider: 'sofascore',
          resource: 'tournament_team_events',
          message: `SofaScore tournament team events request failed for ${input.baseUrl}`,
          requestUrl,
          requestIdentifier: input.baseUrl,
          status: error.status,
          causeMessage: error.causeMessage ?? error.message,
          responseBodySnippet: error.responseBodySnippet,
        });
      }

      throw new ProviderRequestError({
        provider: 'sofascore',
        resource: 'tournament_team_events',
        message: `SofaScore tournament team events request failed unexpectedly for ${input.baseUrl}`,
        requestUrl,
        requestIdentifier: input.baseUrl,
        causeMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
