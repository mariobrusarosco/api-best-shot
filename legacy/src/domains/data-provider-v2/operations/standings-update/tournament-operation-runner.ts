import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import type {
  StandingsUpdateReport,
  StandingsUpdateReportUploadResult,
  StandingsUpdateTournamentContext,
  StandingsUpdateWorkflowStatus,
  TournamentStandingsUpdateResult,
  TournamentStandingsUpdateSummary,
} from '@/domains/data-provider-v2/contracts/standings';
import { randomUUID } from 'crypto';
import { SofaScoreStandingsProvider } from '@/domains/data-provider-v2/providers/sofascore/standings-provider';
import { runTournamentStandingsUpdate } from '@/domains/data-provider-v2/use-cases/standings/run-tournament-standings-update';
import { notifyStandingsUpdateExecution } from './slack-notifier';
import {
  createStandingsUpdateExecutionJob,
  failStandingsUpdateExecutionJob,
  finalizeStandingsUpdateExecutionJob,
  STANDINGS_UPDATE_EXECUTION_OPERATION_TYPE,
} from './execution-job-store';
import { uploadStandingsUpdateReport } from './report-uploader';

export type TournamentStandingsUpdateOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: StandingsUpdateWorkflowStatus;
  summary: TournamentStandingsUpdateSummary;
  reportUpload?: StandingsUpdateReportUploadResult;
  result: TournamentStandingsUpdateResult;
};

export const runTournamentStandingsUpdateOperation = async (input: {
  session: BrowserSession;
  tournament: StandingsUpdateTournamentContext;
  requestId?: string;
  startedAt?: Date;
}): Promise<TournamentStandingsUpdateOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  let executionJobCreated = false;
  let tournamentResult: TournamentStandingsUpdateResult | null = null;
  let reportUpload: StandingsUpdateReportUploadResult | undefined;

  try {
    await createStandingsUpdateExecutionJob({
      requestId,
      tournamentId: input.tournament.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    const provider = SofaScoreStandingsProvider.fromSession(input.session);

    tournamentResult = await runTournamentStandingsUpdate({
      tournament: input.tournament,
      provider,
    });

    const completedAt = new Date();
    const report = buildStandingsUpdateReport({
      requestId,
      tournament: input.tournament,
      startedAt,
      completedAt,
      result: tournamentResult,
    });

    reportUpload = await uploadStandingsUpdateReport(report);

    const summary = mergeSummaryWithReportUpload({
      summary: tournamentResult.summary,
      reportUpload,
    });

    await finalizeStandingsUpdateExecutionJob({
      requestId,
      status: tournamentResult.status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary,
    });

    await notifyStandingsUpdateExecution({
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      status: tournamentResult.status,
      summary,
      reportUpload,
    });

    return {
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      status: tournamentResult.status,
      summary,
      reportUpload,
      result: {
        ...tournamentResult,
        summary,
      },
    };
  } catch (error) {
    const completedAt = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const failureResult =
      tournamentResult ??
      createUnexpectedFailureResult({
        tournamentId: input.tournament.tournamentId,
        errorMessage,
      });

    if (!reportUpload) {
      reportUpload = await uploadStandingsUpdateReport(
        buildStandingsUpdateReport({
          requestId,
          tournament: input.tournament,
          startedAt,
          completedAt,
          result: failureResult,
        })
      );
    }

    const summary = createOperationFailureSummary({
      baseSummary: tournamentResult?.summary,
      reportUpload,
    });

    if (executionJobCreated) {
      try {
        await failStandingsUpdateExecutionJob({
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
          operation: 'runTournamentStandingsUpdateOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournament.tournamentId,
        });
      }
    }

    Logger.error(error instanceof Error ? error : new Error(errorMessage), {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'operations',
      operation: 'runTournamentStandingsUpdateOperation.failed',
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      reportFileUrl: reportUpload?.reportFileUrl,
      reportAvailable: stringifyOptionalBoolean(reportUpload?.reportAvailable),
      failedOperations: String(summary.failedOperations),
      missingTeamsCount: String(summary.missingTeamsCount),
      providerMissingStandingsCount: String(summary.providerMissingStandingsCount),
    });

    await notifyStandingsUpdateExecution({
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      status: 'failed',
      summary,
      reportUpload,
      errorMessage,
    });

    throw error;
  }
};

const buildStandingsUpdateReport = (input: {
  requestId: string;
  tournament: StandingsUpdateTournamentContext;
  startedAt: Date;
  completedAt: Date;
  result: TournamentStandingsUpdateResult;
}): StandingsUpdateReport => {
  return {
    requestId: input.requestId,
    operationType: STANDINGS_UPDATE_EXECUTION_OPERATION_TYPE,
    status: input.result.status,
    tournament: {
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      provider: input.tournament.provider,
    },
    startedAt: input.startedAt.toISOString(),
    completedAt: input.completedAt.toISOString(),
    summary: input.result.summary,
    details: input.result.details,
    data: input.result.data,
  };
};

const mergeSummaryWithReportUpload = (input: {
  summary: TournamentStandingsUpdateSummary;
  reportUpload: StandingsUpdateReportUploadResult;
}): TournamentStandingsUpdateSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

const createOperationFailureSummary = (input: {
  baseSummary?: TournamentStandingsUpdateSummary;
  reportUpload?: StandingsUpdateReportUploadResult;
}): TournamentStandingsUpdateSummary => {
  const baseSummary = input.baseSummary ?? {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    fetchedGroups: 0,
    fetchedRows: 0,
    updatedRows: 0,
    missingTeamsCount: 0,
    providerMissingStandingsCount: 0,
  };

  return {
    ...baseSummary,
    reportUploadStatus: input.reportUpload?.reportUploadStatus ?? baseSummary.reportUploadStatus,
    reportAvailable: input.reportUpload?.reportAvailable ?? baseSummary.reportAvailable,
    reportUploadError: input.reportUpload?.reportUploadError ?? baseSummary.reportUploadError,
  };
};

const createUnexpectedFailureResult = (input: {
  tournamentId: string;
  errorMessage: string;
}): TournamentStandingsUpdateResult => {
  return {
    tournamentId: input.tournamentId,
    status: 'failed',
    summary: {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      fetchedGroups: 0,
      fetchedRows: 0,
      updatedRows: 0,
      missingTeamsCount: 0,
      providerMissingStandingsCount: 0,
    },
    details: {
      updated: [],
      unsupportedTournamentMode: [],
      providerMissingStandings: [],
      missingTeams: [],
      unexpectedFailures: [
        {
          reason: 'unexpected_failure',
          errorMessage: input.errorMessage,
        },
      ],
    },
    data: {
      updatedTeamIds: [],
      missingTeamExternalIds: [],
    },
  };
};

const stringifyOptionalBoolean = (value: boolean | undefined): string | undefined => {
  if (typeof value !== 'boolean') {
    return undefined;
  }

  return String(value);
};
