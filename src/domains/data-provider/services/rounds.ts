import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import type { ENDPOINT_ROUNDS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import db from '@/services/database';
import {
  DB_InsertTournamentRound,
  DB_UpdateTournamentRound,
  T_TournamentRound,
} from '@/domains/tournament/schema';

export class RoundDataProviderService {
  private scraper: BaseScraper;

  constructor(scraper: BaseScraper) {
    this.scraper = scraper;
  }

  public async getTournamentRounds(baseUrl: string) {
    try {
      const url = `${baseUrl}/rounds`;

      await this.scraper.goto(url);
      const content = await this.scraper.getPageContent();

      return content as ENDPOINT_ROUNDS;
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [GET TOURNAMENT ROUNDS]', error);
      throw error;
    }
  }

  public enhanceRounds(
    baseUrl: string,
    tournamentId: string,
    roundsResponse: ENDPOINT_ROUNDS
  ): DB_InsertTournamentRound[] {
    try {
      return roundsResponse.rounds.map((round, index) => {
        const isSpecialRound = !!round?.prefix;
        const isKnockoutRound = !isSpecialRound && !!round?.name;
        const isRegularRound = !isSpecialRound && !isKnockoutRound;

        const order = index + 1;
        let endpoint = `${baseUrl}/events/round/${round.round}`;
        let slug = '';
        let label = '';

        if (isKnockoutRound) {
          endpoint += `/slug/${round.slug}`;
          slug += `${round.slug}`;
          label = round.name || order.toString();
        } else if (isSpecialRound) {
          endpoint += `/slug/${round.slug}/prefix/${round.prefix}`;
          slug += `${round.prefix}-${round.slug}`;
          label = round.prefix!;
        } else if (isRegularRound) {
          slug += round.round;
          label = round.round.toString();
        }

        return {
          providerUrl: endpoint,
          tournamentId: tournamentId,
          order: order.toString(),
          label: label,
          slug: slug.toLowerCase(),
          knockoutId: round.prefix,
          type: isKnockoutRound || isSpecialRound ? 'knockout' : 'season',
          name: round.name,
        } as DB_InsertTournamentRound;
      });
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [ENHANCE TOURNAMENT ROUNDS]', error);
      throw error;
    }
  }

  public async createOnDatabase(roundsToInsert: DB_InsertTournamentRound[]) {
    try {
      console.log(
        '[LOG] - [SofascoreTournamentRounds] - CREATING ROUNDS ON DATABASE',
        roundsToInsert
      );
      const rounds = await db
        .insert(T_TournamentRound)
        .values(roundsToInsert)
        .returning();
      return rounds;
    } catch (error) {
      console.error(
        '[SOFASCORE] - [ERROR] - [CREATE TOURNAMENT ROUNDS ON DATABASE]',
        error
      );
      throw error;
    }
  }

  public async upsertOnDatabase(roundsToUpdate: DB_UpdateTournamentRound[]) {
    try {
      console.log('[LOG] - [SofascoreTournamentRounds] - UPSERTING ROUNDS ON DATABASE');

      return await db.transaction(async tx => {
        for (const round of roundsToUpdate) {
          console.log(
            '[LOG] - [SofascoreTournamentRounds],' + ' - UPSERTING ROUND: ',
            round
          );

          await tx
            .insert(T_TournamentRound)
            .values(round)
            .onConflictDoUpdate({
              target: [T_TournamentRound.slug, T_TournamentRound.tournamentId],
              set: {
                ...round,
              },
            });

          console.log('[LOG] - [SofascoreTournamentRounds] - UPSERTING ROUND: ', round);
        }
      });
    } catch (error) {
      console.error(
        '[SOFASCORE] - [ERROR] - [UPSERT TOURNAMENT ROUNDS ON DATABASE]',
        error
      );
      throw error;
    }
  }

  public async init(tournamentId: string, tournamentBaseUrl: string) {
    console.log(
      '[LOG] - [SofascoreTournamentRounds] - INIT',
      tournamentId,
      tournamentBaseUrl
    );

    const rawRounds = await this.getTournamentRounds(tournamentBaseUrl);
    const enhancedRounds = this.enhanceRounds(tournamentBaseUrl, tournamentId, rawRounds);

    console.log(
      '[LOG] - [SofascoreTournamentRounds] - CREATING ROUNDS ON DATABASE',
      enhancedRounds
    );
    const query = await this.createOnDatabase(enhancedRounds);

    return query;
  }
}
