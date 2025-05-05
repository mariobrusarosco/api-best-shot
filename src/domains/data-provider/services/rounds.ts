import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import type { ENDPOINT_ROUNDS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { CreateTournamentInput } from '../api/v2/tournament/typing';
import db from '@/services/database';
import { DB_InsertTournamentRound, DB_UpdateTournamentRound, T_TournamentRound } from '@/domains/tournament/schema';

export class RoundService {
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

  public enhanceRounds(baseUrl: string, tournamentId: string, roundsResponse: ENDPOINT_ROUNDS): DB_InsertTournamentRound[] {
    try {
      return roundsResponse.rounds.map(round => {
        const isKnockoutRound = !!round?.slug;
        const isSpecialRound = !!round?.prefix;
        let endpoint = `${baseUrl}/events/round/${round.round}`;

        if (isKnockoutRound) endpoint += `/slug/${round.slug}`;
        if (isSpecialRound) endpoint += `/slug/${round.slug}/prefix/${round.prefix}`;

        const label = round.name || round.round.toString() || round.prefix;
        const slug = round.slug || round.round.toString() || round.prefix;

        return {
            providerUrl: endpoint,
            tournamentId: tournamentId,
            order: round.round.toString(),
            label: label,
            slug: slug,
            knockoutId: round.prefix,   
            type: isKnockoutRound ? 'knockout' : 'season',
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
      console.log('[LOG] - [SofascoreTournamentRounds] - CREATING ROUNDS ON DATABASE', roundsToInsert);
      const rounds = await db.insert(T_TournamentRound).values(roundsToInsert).returning();
      return rounds;
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [CREATE TOURNAMENT ROUNDS ON DATABASE]', error);
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
      console.error('[SOFASCORE] - [ERROR] - [UPSERT TOURNAMENT ROUNDS ON DATABASE]', error);
      throw error;
    }
  }

  public async init(tournamentId: string, tournamentBaseUrl: string) {
    const rawRounds = await this.getTournamentRounds(tournamentBaseUrl);
    const enhancedRounds = this.enhanceRounds(tournamentBaseUrl, tournamentId, rawRounds);

    console.log('[LOG] - [SofascoreTournamentRounds] - CREATING ROUNDS ON DATABASE', enhancedRounds);
    const query = await this.createOnDatabase(enhancedRounds);

    return query;
  }
}

