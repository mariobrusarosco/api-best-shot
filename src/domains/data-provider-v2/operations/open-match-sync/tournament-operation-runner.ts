import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  OpenMatchSyncDueMatch,
  OpenMatchSyncReport,
  OpenMatchSyncReportUploadResult,
  OpenMatchSyncWorkflowStatus,
  TournamentOpenMatchSyncResult,
  TournamentOpenMatchSyncSummary,
} from '@/domains/data-provider-v2/contracts/open-match-sync';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import { randomUUID } from 'crypto';
import { notifyOpenMatchSyncExecution } from './slack-notifier';
import {
  createOpenMatchSyncExecutionJob,
  failOpenMatchSyncExecutionJob,
  finalizeOpenMatchSyncExecutionJob,
  OPEN_MATCH_SYNC_EXECUTION_OPERATION_TYPE,
} from './execution-job-store';
import { uploadOpenMatchSyncReport } from './report-uploader';
import { runTournamentOpenMatchSync } from '@/domains/data-provider-v2/use-cases/open-match-sync/run-tournament-open-match-sync';
import { SofaScoreMatchProvider } from '@/domains/data-provider-v2/providers/sofascore/match-provider';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';

export type TournamentOpenMatchSyncOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: OpenMatchSyncWorkflowStatus;
  summary: TournamentOpenMatchSyncSummary;
  reportUpload?: OpenMatchSyncReportUploadResult;
};

export const runTournamentOpenMatchSyncOperation = async (input: {
  session: BrowserSession;
  tournamentId: string;
  dueMatches: OpenMatchSyncDueMatch[];
  requestId?: string;
  startedAt?: Date;
}): Promise<TournamentOpenMatchSyncOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();
  const tournamentLabel = await getTournamentLabel(input.tournamentId);

  let executionJobCreated = false;
  let tournamentResult: TournamentOpenMatchSyncResult | null = null;
  let reportUpload: OpenMatchSyncReportUploadResult | undefined;

  try {
    await createOpenMatchSyncExecutionJob({
      requestId,
      tournamentId: input.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    const provider = SofaScoreMatchProvider.fromSession(input.session);

    tournamentResult = await runTournamentOpenMatchSync({
      tournamentId: input.tournamentId,
      dueMatches: input.dueMatches,
      provider,
    });

    const completedAt = new Date();
    const report = buildOpenMatchSyncReport({
      requestId,
      tournamentId: input.tournamentId,
      tournamentLabel,
      startedAt,
      completedAt,
      result: tournamentResult,
    });

    reportUpload = await uploadOpenMatchSyncReport(report);

    const summary = mergeSummaryWithReportUpload({
      summary: tournamentResult.summary,
      reportUpload,
    });

    await finalizeOpenMatchSyncExecutionJob({
      requestId,
      status: tournamentResult.status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary,
    });

    if (tournamentResult.status === 'failed') {
      logTournamentOperationFailure({
        requestId,
        tournamentId: input.tournamentId,
        tournamentLabel,
        summary,
        reportUpload,
      });
    }

    await notifyOpenMatchSyncExecution({
      requestId,
      tournamentId: input.tournamentId,
      tournamentLabel,
      status: tournamentResult.status,
      summary,
      reportUpload,
    });

    return {
      requestId,
      tournamentId: input.tournamentId,
      tournamentLabel,
      status: tournamentResult.status,
      summary,
      reportUpload,
    };
  } catch (error) {
    const completedAt = new Date();
    const summary = createOperationFailureSummary({
      dueMatchCount: input.dueMatches.length,
      baseSummary: tournamentResult?.summary,
      reportUpload,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (executionJobCreated) {
      try {
        await failOpenMatchSyncExecutionJob({
          requestId,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
          reportFileKey: reportUpload?.reportFileKey,
          reportFileUrl: reportUpload?.reportFileUrl,
          summary,
        });
      } catch (finalizeError) {
        Logger.error(finalizeError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'operations',
          operation: 'runTournamentOpenMatchSyncOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournamentId,
        });
      }
    }

    Logger.error(error instanceof Error ? error : new Error(errorMessage), {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'operations',
      operation: 'runTournamentOpenMatchSyncOperation.failed',
      requestId,
      tournamentId: input.tournamentId,
      tournamentLabel,
      reportFileUrl: reportUpload?.reportFileUrl,
      reportAvailable: stringifyOptionalBoolean(reportUpload?.reportAvailable),
      failedOperations: String(summary.failedOperations),
      unexpectedFailureMatches: String(summary.unexpectedFailureMatches),
      unexpectedFailureMatchIdsPreview: stringifyOptionalStringArray(summary.unexpectedFailureMatchIdsPreview),
    });

    await notifyOpenMatchSyncExecution({
      requestId,
      tournamentId: input.tournamentId,
      tournamentLabel,
      status: 'failed',
      summary,
      reportUpload,
      errorMessage,
    });

    throw error;
  }
};

const buildOpenMatchSyncReport = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  startedAt: Date;
  completedAt: Date;
  result: TournamentOpenMatchSyncResult;
}): OpenMatchSyncReport => {
  return {
    requestId: input.requestId,
    operationType: OPEN_MATCH_SYNC_EXECUTION_OPERATION_TYPE,
    status: input.result.status,
    tournament: {
      tournamentId: input.tournamentId,
      tournamentLabel: input.tournamentLabel,
      provider: 'sofascore',
    },
    startedAt: input.startedAt.toISOString(),
    completedAt: input.completedAt.toISOString(),
    summary: input.result.summary,
    details: input.result.details,
    data: input.result.data,
  };
};

const mergeSummaryWithReportUpload = (input: {
  summary: TournamentOpenMatchSyncSummary;
  reportUpload: OpenMatchSyncReportUploadResult;
}): TournamentOpenMatchSyncSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

const createOperationFailureSummary = (input: {
  dueMatchCount: number;
  baseSummary?: TournamentOpenMatchSyncSummary;
  reportUpload?: OpenMatchSyncReportUploadResult;
}): TournamentOpenMatchSyncSummary => {
  const baseSummary = input.baseSummary ?? {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    scannedMatches: input.dueMatchCount,
    updatedMatches: 0,
    openMatches: 0,
    postponedMatches: 0,
    endedMatches: 0,
    providerNotFoundMatches: 0,
    providerMissingEventMatches: 0,
    unexpectedFailureMatches: 0,
  };

  return {
    ...baseSummary,
    reportUploadStatus: input.reportUpload?.reportUploadStatus ?? baseSummary.reportUploadStatus,
    reportAvailable: input.reportUpload?.reportAvailable ?? baseSummary.reportAvailable,
    reportUploadError: input.reportUpload?.reportUploadError ?? baseSummary.reportUploadError,
  };
};

const getTournamentLabel = async (tournamentId: string): Promise<string> => {
  try {
    const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
    const tournamentLabel = tournament?.label?.trim();

    if (tournamentLabel) {
      return tournamentLabel;
    }
  } catch (error) {
    Logger.warn('Open match sync operation could not load tournament label; falling back to tournamentId', {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'operations',
      operation: 'runTournamentOpenMatchSyncOperation.getTournamentLabel',
      tournamentId,
      causeMessage: error instanceof Error ? error.message : String(error),
    });
  }

  return tournamentId;
};

const logTournamentOperationFailure = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  summary: TournamentOpenMatchSyncSummary;
  reportUpload?: OpenMatchSyncReportUploadResult;
}): void => {
  Logger.error(new Error(`Open match sync tournament operation failed for ${input.tournamentId}`), {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'operations',
    operation: 'runTournamentOpenMatchSyncOperation.failedSummary',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    tournamentLabel: input.tournamentLabel,
    reportFileUrl: input.reportUpload?.reportFileUrl,
    reportAvailable: stringifyOptionalBoolean(input.reportUpload?.reportAvailable),
    failedOperations: String(input.summary.failedOperations),
    unexpectedFailureMatches: String(input.summary.unexpectedFailureMatches),
    unexpectedFailureMatchIdsPreview: stringifyOptionalStringArray(input.summary.unexpectedFailureMatchIdsPreview),
  });
};

const stringifyOptionalBoolean = (value: boolean | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return String(value);
};

const stringifyOptionalStringArray = (value: string[] | undefined): string | undefined => {
  if (!value || value.length === 0) {
    return undefined;
  }

  return value.join(',');
};
