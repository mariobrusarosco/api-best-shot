import db from '@/core/database';
import type { TournamentUpdateInput } from '@/domains/data-provider-v2/contracts/tournament-update';
import type { DB_SelectTournament } from '@/domains/tournament/schema';
import { T_Tournament } from '@/domains/tournament/schema';
import { eq } from 'drizzle-orm';

type TournamentUpdatePersistInput = {
  externalId: TournamentUpdateInput['tournamentPublicId'];
  baseUrl: TournamentUpdateInput['baseUrl'];
  publicUrl: TournamentUpdateInput['publicUrl'];
  slug: TournamentUpdateInput['slug'];
  provider: TournamentUpdateInput['provider'];
  season: TournamentUpdateInput['season'];
  mode: TournamentUpdateInput['mode'];
  label: TournamentUpdateInput['label'];
  standingsMode: TournamentUpdateInput['standingsMode'];
  logo: string;
};

export const updateTournament = async (input: {
  tournamentId: string;
  tournament: TournamentUpdatePersistInput;
}): Promise<DB_SelectTournament | null> => {
  const [tournament] = await db
    .update(T_Tournament)
    .set(input.tournament)
    .where(eq(T_Tournament.id, input.tournamentId))
    .returning();

  return tournament ?? null;
};
