import type { DB_SelectMatch } from '@/domains/match/schema';

export type OpenMatchSyncDueMatch = {
  id: string;
  externalId: string;
  provider: string;
  status: DB_SelectMatch['status'];
  date: Date | null;
  tournamentId: string;
  roundSlug: string;
};
