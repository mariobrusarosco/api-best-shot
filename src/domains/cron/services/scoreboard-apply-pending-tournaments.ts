import Logger from '@/core/logger';

export const scoreboardApplyPendingTournamentsHandler = async (): Promise<void> => {
  Logger.warn('[CRON_TARGET:scoreboard.apply_pending_tournaments] target registered but not implemented yet');

  throw new Error('scoreboard.apply_pending_tournaments target is not implemented yet');
};
