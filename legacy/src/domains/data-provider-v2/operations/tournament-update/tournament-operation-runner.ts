import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  TournamentUpdateInput,
  TournamentUpdateReportUploadResult,
  TournamentUpdateSummary,
  TournamentUpdateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/tournament-update';
import { BrowserAssetUploader } from '@/domains/data-provider-v2/transport/playwright/browser-asset-uploader';
import { PlaywrightRuntime } from '@/domains/data-provider-v2/transport/playwright/runtime';
import {
  normalizeTournamentUpdateInput,
  runTournamentUpdate,
  shouldRefreshTournamentLogo,
} from '@/domains/data-provider-v2/use-cases/tournament/run-tournament-update';
import type { DB_SelectTournament } from '@/domains/tournament/schema';
import { randomUUID } from 'crypto';
import {
  createTournamentUpdateExecutionJob,
  failTournamentUpdateExecutionJob,
  finalizeTournamentUpdateExecutionJob,
  type TournamentUpdateExecutionJob,
} from './execution-job-store';
import {
  buildTournamentUpdateDetails,
  buildTournamentUpdateReport,
  buildTournamentUpdateReportData,
  buildTournamentUpdateSummary,
  deriveTournamentUpdateWorkflowStatus,
  mergeTournamentUpdateSummaryWithReportUpload,
} from './report-builder';
import { uploadTournamentUpdateReport } from './report-uploader';
import { notifyTournamentUpdateExecution } from './slack-notifier';

export type TournamentUpdateOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: 'completed' | 'failed';
  summary: TournamentUpdateSummary;
  reportUpload?: TournamentUpdateReportUploadResult;
  result: TournamentUpdateWorkflowResult;
  executionJob: TournamentUpdateExecutionJob;
};

export const runTournamentUpdateOperation = async (input: {
  tournamentId: string;
  previousTournament: DB_SelectTournament;
  tournament: TournamentUpdateInput;
  requestId?: string;
  startedAt?: Date;
}): Promise<TournamentUpdateOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  const normalizedTournament = normalizeTournamentUpdateInput(input.tournament);
  const needsLogoRefresh = shouldRefreshTournamentLogo({
    previousTournament: input.previousTournament,
    tournament: normalizedTournament,
  });

  let executionJobCreated = false;
  let runtime: PlaywrightRuntime | null = null;
  let tournamentResult: TournamentUpdateWorkflowResult | null = null;
  let reportUpload: TournamentUpdateReportUploadResult | undefined;

  try {
    await createTournamentUpdateExecutionJob({
      requestId,
      tournamentId: input.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    let logoUploader: BrowserAssetUploader | undefined;

    if (needsLogoRefresh) {
      runtime = await PlaywrightRuntime.create();
      const session = await runtime.createSession();

      logoUploader = new BrowserAssetUploader(session);

      try {
        tournamentResult = await runTournamentUpdate({
          tournamentId: input.tournamentId,
          previousTournament: input.previousTournament,
          tournament: input.tournament,
          logoUploader,
        });
      } finally {
        await session.close();
      }
    } else {
      tournamentResult = await runTournamentUpdate({
        tournamentId: input.tournamentId,
        previousTournament: input.previousTournament,
        tournament: input.tournament,
      });
    }

    const completedAt = new Date();
    const status = deriveTournamentUpdateWorkflowStatus(tournamentResult);
    const summary = buildTournamentUpdateSummary(tournamentResult);
    const details = buildTournamentUpdateDetails(tournamentResult);
    const data = buildTournamentUpdateReportData(tournamentResult);
    const report = buildTournamentUpdateReport({
      requestId,
      result: tournamentResult,
      startedAt,
      completedAt,
      status,
      summary,
      details,
      data,
    });

    reportUpload = await uploadTournamentUpdateReport(report);

    const summaryWithReportUpload = mergeTournamentUpdateSummaryWithReportUpload({
      summary,
      reportUpload,
    });

    const finalizedExecutionJob = await finalizeTournamentUpdateExecutionJob({
      requestId,
      status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary: summaryWithReportUpload,
    });

    if (!finalizedExecutionJob) {
      throw new Error(`Tournament update execution finalization returned no row for requestId=${requestId}`);
    }

    await notifyTournamentUpdateExecution({
      requestId,
      tournamentId: input.tournamentId,
      tournamentPublicId: tournamentResult.tournament.tournamentPublicId,
      tournamentLabel: tournamentResult.tournament.label,
      status,
      summary: summaryWithReportUpload,
      reportUpload,
    });

    return {
      requestId,
      tournamentId: input.tournamentId,
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
    const fallbackSummary = tournamentResult ? buildTournamentUpdateSummary(tournamentResult) : createFallbackSummary();
    const fallbackSummaryWithReportUpload = reportUpload
      ? mergeTournamentUpdateSummaryWithReportUpload({
          summary: fallbackSummary,
          reportUpload,
        })
      : fallbackSummary;

    if (executionJobCreated) {
      try {
        await failTournamentUpdateExecutionJob({
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
          operation: 'runTournamentUpdateOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournamentId,
        });
      }
    }

    await notifyTournamentUpdateExecution({
      requestId,
      tournamentId: input.tournamentId,
      tournamentPublicId: tournamentResult?.tournament.tournamentPublicId ?? normalizedTournament.tournamentPublicId,
      tournamentLabel: tournamentResult?.tournament.label ?? normalizedTournament.label,
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

const createFallbackSummary = (): TournamentUpdateSummary => {
  return {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    updatedTournaments: 0,
    uploadedAssets: 0,
  };
};
