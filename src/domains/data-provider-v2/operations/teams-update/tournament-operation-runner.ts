import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  TeamsTournamentContext,
  TeamsUpdateReportUploadResult,
  TeamsUpdateWorkflowStatus,
  TournamentTeamsUpdateSummary,
  TournamentTeamsUpdateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/teams';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { SofaScoreStandingsProvider } from '@/domains/data-provider-v2/providers/sofascore/standings-provider';
import { BrowserAssetUploader } from '@/domains/data-provider-v2/transport/playwright/browser-asset-uploader';
import { PlaywrightRuntime } from '@/domains/data-provider-v2/transport/playwright/runtime';
import { randomUUID } from 'crypto';
import { runTournamentTeamsUpdate } from '@/domains/data-provider-v2/use-cases/teams/run-tournament-teams-update';
import {
  createTeamsUpdateExecutionJob,
  failTeamsUpdateExecutionJob,
  finalizeTeamsUpdateExecutionJob,
  type TeamsUpdateExecutionJob,
} from './execution-job-store';
import {
  buildTeamsUpdateDetails,
  buildTeamsUpdateReport,
  buildTeamsUpdateReportData,
  buildTeamsUpdateSummary,
  deriveTeamsUpdateWorkflowStatus,
  mergeTeamsUpdateSummaryWithReportUpload,
} from './report-builder';
import { uploadTeamsUpdateReport } from './report-uploader';
import { notifyTeamsUpdateExecution } from './slack-notifier';

export type TeamsUpdateOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: TeamsUpdateWorkflowStatus;
  summary: TournamentTeamsUpdateSummary;
  reportUpload?: TeamsUpdateReportUploadResult;
  result: TournamentTeamsUpdateWorkflowResult;
  executionJob: TeamsUpdateExecutionJob;
};

export const runTournamentTeamsUpdateOperation = async (input: {
  tournament: TeamsTournamentContext;
  requestId?: string;
  startedAt?: Date;
}): Promise<TeamsUpdateOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  let executionJobCreated = false;
  let runtime: PlaywrightRuntime | null = null;
  let teamsResult: TournamentTeamsUpdateWorkflowResult | null = null;
  let reportUpload: TeamsUpdateReportUploadResult | undefined;

  try {
    await createTeamsUpdateExecutionJob({
      requestId,
      tournamentId: input.tournament.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    runtime = await PlaywrightRuntime.create();
    const session = await runtime.createSession();

    try {
      teamsResult = await runTournamentTeamsUpdate({
        tournament: input.tournament,
        standingsProvider: SofaScoreStandingsProvider.fromSession(session),
        roundProvider: SofaScoreRoundProvider.fromSession(session),
        badgeUploader: new BrowserAssetUploader(session),
      });
    } finally {
      await session.close();
    }

    const completedAt = new Date();
    const status = deriveTeamsUpdateWorkflowStatus(teamsResult);
    const summary = buildTeamsUpdateSummary(teamsResult);
    const details = buildTeamsUpdateDetails(teamsResult);
    const data = buildTeamsUpdateReportData(teamsResult);
    const report = buildTeamsUpdateReport({
      requestId,
      result: teamsResult,
      startedAt,
      completedAt,
      status,
      summary,
      details,
      data,
    });

    reportUpload = await uploadTeamsUpdateReport(report);

    const summaryWithReportUpload = mergeTeamsUpdateSummaryWithReportUpload({
      summary,
      reportUpload,
    });

    const finalizedExecutionJob = await finalizeTeamsUpdateExecutionJob({
      requestId,
      status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary: summaryWithReportUpload,
    });

    if (!finalizedExecutionJob) {
      throw new Error(`Teams update execution finalization returned no row for requestId=${requestId}`);
    }

    await notifyTeamsUpdateExecution({
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      status,
      summary: summaryWithReportUpload,
      reportUpload,
    });

    return {
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      status,
      summary: summaryWithReportUpload,
      reportUpload,
      result: teamsResult,
      executionJob: finalizedExecutionJob,
    };
  } catch (error) {
    const completedAt = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fallbackSummary = teamsResult ? buildTeamsUpdateSummary(teamsResult) : createFallbackSummary();
    const fallbackSummaryWithReportUpload = reportUpload
      ? mergeTeamsUpdateSummaryWithReportUpload({
          summary: fallbackSummary,
          reportUpload,
        })
      : fallbackSummary;

    if (executionJobCreated) {
      try {
        await failTeamsUpdateExecutionJob({
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
          operation: 'runTournamentTeamsUpdateOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournament.tournamentId,
        });
      }
    }

    await notifyTeamsUpdateExecution({
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
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

const createFallbackSummary = (): TournamentTeamsUpdateSummary => {
  return {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    fetchedSources: 0,
    fetchedTeams: 0,
    upsertedTeams: 0,
    createdTeams: 0,
    updatedTeams: 0,
    uploadedAssets: 0,
    providerMissingSourcesCount: 0,
    invalidProviderTeamsCount: 0,
  };
};
