import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  TournamentCreateReportUploadResult,
  TournamentCreateSummary,
  TournamentCreateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/tournament-create';
import { PlaywrightRuntime } from '@/domains/data-provider-v2/transport/playwright/runtime';
import { randomUUID } from 'crypto';
import { runTournamentCreate } from '@/domains/data-provider-v2/use-cases/tournament/run-tournament-create';
import { BrowserAssetUploader } from '@/domains/data-provider-v2/transport/playwright/browser-asset-uploader';
import {
  assignTournamentCreateExecutionJobTournament,
  createTournamentCreateExecutionJob,
  failTournamentCreateExecutionJob,
  finalizeTournamentCreateExecutionJob,
  type TournamentCreateExecutionJob,
} from './execution-job-store';
import {
  buildTournamentCreateDetails,
  buildTournamentCreateReport,
  buildTournamentCreateReportData,
  buildTournamentCreateSummary,
  deriveTournamentCreateWorkflowStatus,
  mergeTournamentCreateSummaryWithReportUpload,
} from './report-builder';
import { uploadTournamentCreateReport } from './report-uploader';
import { notifyTournamentCreateExecution } from './slack-notifier';
import type { TournamentCreateInput } from '@/domains/data-provider-v2/contracts/tournament-create';

export type TournamentCreateOperationResult = {
  requestId: string;
  tournamentId?: string;
  tournamentLabel: string;
  status: 'completed' | 'failed';
  summary: TournamentCreateSummary;
  reportUpload?: TournamentCreateReportUploadResult;
  result: TournamentCreateWorkflowResult;
  executionJob: TournamentCreateExecutionJob;
};

export const runTournamentCreateOperation = async (input: {
  tournament: TournamentCreateInput;
  requestId?: string;
  startedAt?: Date;
}): Promise<TournamentCreateOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  let executionJobCreated = false;
  let runtime: PlaywrightRuntime | null = null;
  let tournamentResult: TournamentCreateWorkflowResult | null = null;
  let reportUpload: TournamentCreateReportUploadResult | undefined;

  try {
    await createTournamentCreateExecutionJob({
      requestId,
      startedAt,
    });
    executionJobCreated = true;

    runtime = await PlaywrightRuntime.create();
    const session = await runtime.createSession();

    try {
      const logoUploader = new BrowserAssetUploader(session, {
        tournamentPublicUrl: input.tournament.publicUrl,
      });

      tournamentResult = await runTournamentCreate({
        tournament: input.tournament,
        logoUploader,
      });
    } finally {
      await session.close();
    }

    if (tournamentResult.outcome === 'created') {
      await assignTournamentCreateExecutionJobTournament({
        requestId,
        tournamentId: tournamentResult.createdTournament.id,
      });
    }

    const completedAt = new Date();
    const status = deriveTournamentCreateWorkflowStatus(tournamentResult);
    const summary = buildTournamentCreateSummary(tournamentResult);
    const details = buildTournamentCreateDetails(tournamentResult);
    const data = buildTournamentCreateReportData(tournamentResult);
    const report = buildTournamentCreateReport({
      requestId,
      result: tournamentResult,
      startedAt,
      completedAt,
      status,
      summary,
      details,
      data,
    });

    reportUpload = await uploadTournamentCreateReport(report);

    const summaryWithReportUpload = mergeTournamentCreateSummaryWithReportUpload({
      summary,
      reportUpload,
    });

    const finalizedExecutionJob = await finalizeTournamentCreateExecutionJob({
      requestId,
      status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary: summaryWithReportUpload,
    });

    if (!finalizedExecutionJob) {
      throw new Error(`Tournament create execution finalization returned no row for requestId=${requestId}`);
    }

    await notifyTournamentCreateExecution({
      requestId,
      tournamentPublicId: tournamentResult.tournament.tournamentPublicId,
      createdTournamentId: tournamentResult.outcome === 'created' ? tournamentResult.createdTournament.id : undefined,
      tournamentLabel: tournamentResult.tournament.label,
      status,
      summary: summaryWithReportUpload,
      reportUpload,
    });

    return {
      requestId,
      tournamentId: tournamentResult.outcome === 'created' ? tournamentResult.createdTournament.id : undefined,
      tournamentLabel: tournamentResult.tournament.label,
      status,
      summary: summaryWithReportUpload,
      reportUpload,
      result: tournamentResult,
      executionJob: finalizedExecutionJob,
    };
  } catch (error) {
    const completedAt = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fallbackSummary = tournamentResult ? buildTournamentCreateSummary(tournamentResult) : createFallbackSummary();
    const fallbackSummaryWithReportUpload = reportUpload
      ? mergeTournamentCreateSummaryWithReportUpload({
          summary: fallbackSummary,
          reportUpload,
        })
      : fallbackSummary;

    if (executionJobCreated) {
      try {
        await failTournamentCreateExecutionJob({
          requestId,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
          reportFileKey: reportUpload?.reportFileKey,
          reportFileUrl: reportUpload?.reportFileUrl,
          summary: fallbackSummaryWithReportUpload,
        });
      } catch (finalizeError) {
        Logger.error(finalizeError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'operations',
          operation: 'runTournamentCreateOperation.finalizeFailure',
          requestId,
          tournamentPublicId: input.tournament.tournamentPublicId,
        });
      }
    }

    await notifyTournamentCreateExecution({
      requestId,
      tournamentPublicId: tournamentResult?.tournament.tournamentPublicId ?? input.tournament.tournamentPublicId,
      createdTournamentId: tournamentResult?.outcome === 'created' ? tournamentResult.createdTournament.id : undefined,
      tournamentLabel: tournamentResult?.tournament.label ?? input.tournament.label,
      status: 'failed',
      summary: fallbackSummaryWithReportUpload,
      reportUpload,
      errorMessage,
    });

    throw error;
  } finally {
    await runtime?.close();
  }
};

const createFallbackSummary = (): TournamentCreateSummary => {
  return {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    createdTournaments: 0,
    uploadedAssets: 0,
  };
};
