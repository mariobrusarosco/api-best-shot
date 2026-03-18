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

export type OpenMatchPollingUpdateInput = {
  matchId: string;
  status: DB_SelectMatch['status'];
  homeScore: number | null;
  awayScore: number | null;
  homePenaltiesScore: number | null;
  awayPenaltiesScore: number | null;
  checkedAt: Date;
};

export type OpenMatchSyncUpdatedMatch = {
  id: string;
  externalId: string;
  status: DB_SelectMatch['status'];
  homeScore: number | null;
  awayScore: number | null;
  homePenaltiesScore: number | null;
  awayPenaltiesScore: number | null;
  checkedAt: Date | null;
};

export type OpenMatchCheckedAtTouchInput = {
  matchId: string;
  checkedAt: Date;
};

export type OpenMatchSyncCheckedMatch = {
  id: string;
  externalId: string;
  status: DB_SelectMatch['status'];
  checkedAt: Date | null;
};
