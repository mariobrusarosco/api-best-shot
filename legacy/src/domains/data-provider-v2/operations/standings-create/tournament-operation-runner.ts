import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  StandingsCreateReport,
  StandingsCreateReportUploadResult,
  StandingsCreateTournamentContext,
  StandingsCreateWorkflowStatus,
  TournamentStandingsCreateResult,
  TournamentStandingsCreateSummary,
} from '@/domains/data-provider-v2/contracts/standings';
import { PlaywrightRuntime } from '@/domains/data-provider-v2/transport/playwright/runtime';
import { randomUUID } from 'crypto';
import { SofaScoreStandingsProvider } from '@/domains/data-provider-v2/providers/sofascore/standings-provider';
import { runTournamentStandingsCreate } from '@/domains/data-provider-v2/use-cases/standings/run-tournament-standings-create';
import { notifyStandingsCreateExecution } from './slack-notifier';
import {
  createStandingsCreateExecutionJob,
  failStandingsCreateExecutionJob,
  finalizeStandingsCreateExecutionJob,
  STANDINGS_CREATE_EXECUTION_OPERATION_TYPE,
} from './execution-job-store';
import { uploadStandingsCreateReport } from './report-uploader';

export type TournamentStandingsCreateOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: StandingsCreateWorkflowStatus;
  summary: TournamentStandingsCreateSummary;
  reportUpload?: StandingsCreateReportUploadResult;
  result: TournamentStandingsCreateResult;
};

export const runTournamentStandingsCreateOperation = async (input: {
  tournament: StandingsCreateTournamentContext;
  requestId?: string;
  startedAt?: Date;
}): Promise<TournamentStandingsCreateOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  let executionJobCreated = false;
  let runtime: PlaywrightRuntime | null = null;
  let tournamentResult: TournamentStandingsCreateResult | null = null;
  let reportUpload: StandingsCreateReportUploadResult | undefined;

  try {
    await createStandingsCreateExecutionJob({
      requestId,
      tournamentId: input.tournament.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    runtime = await PlaywrightRuntime.create();
    const session = await runtime.createSession();

    try {
      const provider = SofaScoreStandingsProvider.fromSession(session);

      tournamentResult = await runTournamentStandingsCreate({
        tournament: input.tournament,
        provider,
      });
    } finally {
      await session.close();
    }

    const completedAt = new Date();
    const report = buildStandingsCreateReport({
      requestId,
      tournament: input.tournament,
      startedAt,
      completedAt,
      result: tournamentResult,
    });

    reportUpload = await uploadStandingsCreateReport(report);

    const summary = mergeSummaryWithReportUpload({
      summary: tournamentResult.summary,
      reportUpload,
    });

    await finalizeStandingsCreateExecutionJob({
      requestId,
      status: tournamentResult.status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary,
    });

    await notifyStandingsCreateExecution({
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
      reportUpload = await uploadStandingsCreateReport(
        buildStandingsCreateReport({
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
        await failStandingsCreateExecutionJob({
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
          operation: 'runTournamentStandingsCreateOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournament.tournamentId,
        });
      }
    }

    Logger.error(error instanceof Error ? error : new Error(errorMessage), {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'operations',
      operation: 'runTournamentStandingsCreateOperation.failed',
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      reportFileUrl: reportUpload?.reportFileUrl,
      reportAvailable: stringifyOptionalBoolean(reportUpload?.reportAvailable),
      failedOperations: String(summary.failedOperations),
      missingTeamsCount: String(summary.missingTeamsCount),
      providerMissingStandingsCount: String(summary.providerMissingStandingsCount),
    });

    await notifyStandingsCreateExecution({
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      status: 'failed',
      summary,
      reportUpload,
      errorMessage,
    });

    throw error;
  } finally {
    await runtime?.close();
  }
};

const buildStandingsCreateReport = (input: {
  requestId: string;
  tournament: StandingsCreateTournamentContext;
  startedAt: Date;
  completedAt: Date;
  result: TournamentStandingsCreateResult;
}): StandingsCreateReport => {
  return {
    requestId: input.requestId,
    operationType: STANDINGS_CREATE_EXECUTION_OPERATION_TYPE,
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
  summary: TournamentStandingsCreateSummary;
  reportUpload: StandingsCreateReportUploadResult;
}): TournamentStandingsCreateSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

const createOperationFailureSummary = (input: {
  baseSummary?: TournamentStandingsCreateSummary;
  reportUpload?: StandingsCreateReportUploadResult;
}): TournamentStandingsCreateSummary => {
  const baseSummary = input.baseSummary ?? {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    fetchedGroups: 0,
    fetchedRows: 0,
    createdRows: 0,
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
}): TournamentStandingsCreateResult => {
  return {
    tournamentId: input.tournamentId,
    status: 'failed',
    summary: {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      fetchedGroups: 0,
      fetchedRows: 0,
      createdRows: 0,
      missingTeamsCount: 0,
      providerMissingStandingsCount: 0,
    },
    details: {
      created: [],
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
      createdTeamIds: [],
      missingTeamExternalIds: [],
    },
  };
};

const stringifyOptionalBoolean = (value: boolean | undefined): string | undefined => {
  return typeof value === 'boolean' ? String(value) : undefined;
};
