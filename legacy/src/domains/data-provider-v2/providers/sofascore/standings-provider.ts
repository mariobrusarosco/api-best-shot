import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { ProviderRequestError } from '@/domains/data-provider-v2/contracts/errors';
import type {
  SofaScoreStandingsPayload,
  SofaScoreTournamentTeamEventsPayload,
} from '@/domains/data-provider-v2/contracts/standings';
import {
  BrowserRequest,
  type BrowserJsonResponse,
  BrowserRequestTransportError,
} from '@/domains/data-provider-v2/transport/playwright/browser-request';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import { buildSofaScoreTournamentStandingsUrl, buildSofaScoreTournamentTeamEventsUrl } from './endpoints';

export class SofaScoreStandingsProvider {
  private readonly browserRequest: BrowserRequest;
  private readonly tournamentPublicUrl?: string;

  private constructor(input: { browserRequest: BrowserRequest; tournamentPublicUrl?: string }) {
    this.browserRequest = input.browserRequest;
    this.tournamentPublicUrl = input.tournamentPublicUrl?.trim() || undefined;
  }

  public static fromSession(
    session: BrowserSession,
    options?: { tournamentPublicUrl?: string }
  ): SofaScoreStandingsProvider {
    return new SofaScoreStandingsProvider({
      browserRequest: new BrowserRequest(session),
      tournamentPublicUrl: options?.tournamentPublicUrl,
    });
  }

  public async fetchTournamentStandings(input: { baseUrl: string }): Promise<SofaScoreStandingsPayload> {
    const requestUrl = buildSofaScoreTournamentStandingsUrl(input.baseUrl);

    try {
      const response = await this.fetchJsonWithWarmup<SofaScoreStandingsPayload>({
        requestUrl,
        requestIdentifier: input.baseUrl,
        operation: 'SofaScoreStandingsProvider.fetchTournamentStandings',
        warningMessage: 'SofaScore tournament warmup failed before retrying standings request',
      });

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
      const response = await this.fetchJsonWithWarmup<SofaScoreTournamentTeamEventsPayload>({
        requestUrl,
        requestIdentifier: input.baseUrl,
        operation: 'SofaScoreStandingsProvider.fetchTournamentTeamEvents',
        warningMessage: 'SofaScore tournament warmup failed before retrying team events request',
      });

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
