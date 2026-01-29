import { and, eq, isNull, or } from 'drizzle-orm';
import db from '../../src/services/database';
import { T_Match, T_Team } from '../../src/services/database/schema';
import Logger from '../../src/services/logger';
import { DOMAINS } from '../../src/services/logger/constants';

async function populateMatchTeamFKs() {
  try {
    Logger.info('Starting match team FK population');

    // Fetch all matches with NULL team FKs
    const matchesNeedingUpdate = await db
      .select({
        id: T_Match.id,
        externalId: T_Match.externalId,
        provider: T_Match.provider,
        externalHomeTeamId: T_Match.externalHomeTeamId,
        externalAwayTeamId: T_Match.externalAwayTeamId,
        homeTeamId: T_Match.homeTeamId,
        awayTeamId: T_Match.awayTeamId,
      })
      .from(T_Match)
      .where(or(isNull(T_Match.homeTeamId), isNull(T_Match.awayTeamId)));

    Logger.info(`Found ${matchesNeedingUpdate.length} matches needing FK updates`);

    let successCount = 0;
    let errorCount = 0;
    const orphanedMatches: string[] = [];

    for (const match of matchesNeedingUpdate) {
      try {
        // Look up home team
        const [homeTeam] = await db
          .select({ id: T_Team.id })
          .from(T_Team)
          .where(and(eq(T_Team.externalId, match.externalHomeTeamId), eq(T_Team.provider, match.provider)))
          .limit(1);

        // Look up away team
        const [awayTeam] = await db
          .select({ id: T_Team.id })
          .from(T_Team)
          .where(and(eq(T_Team.externalId, match.externalAwayTeamId), eq(T_Team.provider, match.provider)))
          .limit(1);

        if (!homeTeam || !awayTeam) {
          orphanedMatches.push(
            `Match ${match.externalId} (${match.provider}): Missing ${!homeTeam ? 'home' : 'away'} team`
          );
          errorCount++;
          continue;
        }

        // Ensure team IDs are not null (they should always have IDs since they're from the database)
        if (!homeTeam.id || !awayTeam.id) {
          orphanedMatches.push(
            `Match ${match.externalId} (${match.provider}): Team missing ID ${!homeTeam.id ? 'home' : 'away'}`
          );
          errorCount++;
          continue;
        }

        // Update match with team UUIDs
        // Type assertion is safe here because we've verified both teams exist and have IDs
        await db
          .update(T_Match)
          .set({
            homeTeamId: homeTeam.id as string,
            awayTeamId: awayTeam.id as string,
          })
          .where(eq(T_Match.id, match.id));

        successCount++;

        if (successCount % 100 === 0) {
          Logger.info(`Progress: ${successCount} matches updated`);
        }
      } catch (error) {
        Logger.error(error as Error, {
          domain: DOMAINS.MATCH,
          operation: 'populate_match_team_fks',
          matchId: match.id,
        });
        errorCount++;
      }
    }

    Logger.info('Match team FK population complete', {
      successCount,
      errorCount,
      orphanedCount: orphanedMatches.length,
    });

    if (orphanedMatches.length > 0) {
      Logger.error(new Error('Orphaned matches found'), {
        domain: DOMAINS.MATCH,
        operation: 'populate_match_team_fks',
        orphanedMatches: orphanedMatches.join(', '),
      });
      console.log('\n⚠️  Orphaned Matches:');
      orphanedMatches.forEach(msg => console.log(`  - ${msg}`));
    }

    console.log('\n✅ Migration Summary:');
    console.log(`  - Total matches processed: ${matchesNeedingUpdate.length}`);
    console.log(`  - Successfully updated: ${successCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Orphaned matches: ${orphanedMatches.length}`);

    process.exit(orphanedMatches.length > 0 ? 1 : 0);
  } catch (error) {
    Logger.error(error as Error, {
      domain: DOMAINS.MATCH,
      operation: 'populate_match_team_fks',
    });
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

populateMatchTeamFKs();
