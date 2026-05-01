import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  TeamsCreateReportUploadResult,
  TeamsCreateWorkflowStatus,
  TournamentTeamsCreateSummary,
  TournamentTeamsCreateWorkflowResult,
  TeamsTournamentContext,
} from '@/domains/data-provider-v2/contracts/teams';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { SofaScoreStandingsProvider } from '@/domains/data-provider-v2/providers/sofascore/standings-provider';
import { BrowserAssetUploader } from '@/domains/data-provider-v2/transport/playwright/browser-asset-uploader';
import { PlaywrightRuntime } from '@/domains/data-provider-v2/transport/playwright/runtime';
import { randomUUID } from 'crypto';
import { runTournamentTeamsCreate } from '@/domains/data-provider-v2/use-cases/teams/run-tournament-teams-create';
import {
  createTeamsCreateExecutionJob,
  failTeamsCreateExecutionJob,
  finalizeTeamsCreateExecutionJob,
  type TeamsCreateExecutionJob,
} from './execution-job-store';
import {
  buildTeamsCreateDetails,
  buildTeamsCreateReport,
  buildTeamsCreateReportData,
  buildTeamsCreateSummary,
  deriveTeamsCreateWorkflowStatus,
  mergeTeamsCreateSummaryWithReportUpload,
} from './report-builder';
import { uploadTeamsCreateReport } from './report-uploader';
import { notifyTeamsCreateExecution } from './slack-notifier';

export type TeamsCreateOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: TeamsCreateWorkflowStatus;
  summary: TournamentTeamsCreateSummary;
  reportUpload?: TeamsCreateReportUploadResult;
  result: TournamentTeamsCreateWorkflowResult;
  executionJob: TeamsCreateExecutionJob;
};

export const runTournamentTeamsCreateOperation = async (input: {
  tournament: TeamsTournamentContext;
  requestId?: string;
  startedAt?: Date;
}): Promise<TeamsCreateOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  let executionJobCreated = false;
  let runtime: PlaywrightRuntime | null = null;
  let teamsResult: TournamentTeamsCreateWorkflowResult | null = null;
  let reportUpload: TeamsCreateReportUploadResult | undefined;

  try {
    await createTeamsCreateExecutionJob({
      requestId,
      tournamentId: input.tournament.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    runtime = await PlaywrightRuntime.create();
    const session = await runtime.createSession();

    try {
      teamsResult = await runTournamentTeamsCreate({
        tournament: input.tournament,
        standingsProvider: SofaScoreStandingsProvider.fromSession(session),
        roundProvider: SofaScoreRoundProvider.fromSession(session),
        badgeUploader: new BrowserAssetUploader(session, {
          tournamentPublicUrl: input.tournament.tournamentPublicUrl,
        }),
      });
    } finally {
      await session.close();
    }

    const completedAt = new Date();
    const status = deriveTeamsCreateWorkflowStatus(teamsResult);
    const summary = buildTeamsCreateSummary(teamsResult);
    const details = buildTeamsCreateDetails(teamsResult);
    const data = buildTeamsCreateReportData(teamsResult);
    const report = buildTeamsCreateReport({
      requestId,
      result: teamsResult,
      startedAt,
      completedAt,
      status,
      summary,
      details,
      data,
    });

    reportUpload = await uploadTeamsCreateReport(report);

    const summaryWithReportUpload = mergeTeamsCreateSummaryWithReportUpload({
      summary,
      reportUpload,
    });

    const finalizedExecutionJob = await finalizeTeamsCreateExecutionJob({
      requestId,
      status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary: summaryWithReportUpload,
    });

    if (!finalizedExecutionJob) {
      throw new Error(`Teams create execution finalization returned no row for requestId=${requestId}`);
    }

    await notifyTeamsCreateExecution({
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
    const fallbackSummary = teamsResult ? buildTeamsCreateSummary(teamsResult) : createFallbackSummary();
    const fallbackSummaryWithReportUpload = reportUpload
      ? mergeTeamsCreateSummaryWithReportUpload({
          summary: fallbackSummary,
          reportUpload,
        })
      : fallbackSummary;

    if (executionJobCreated) {
      try {
        await failTeamsCreateExecutionJob({
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
          operation: 'runTournamentTeamsCreateOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournament.tournamentId,
        });
      }
    }

    await notifyTeamsCreateExecution({
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

const createFallbackSummary = (): TournamentTeamsCreateSummary => {
  return {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    fetchedSources: 0,
    fetchedTeams: 0,
    createdTeams: 0,
    skippedExistingTeams: 0,
    uploadedAssets: 0,
    providerMissingSourcesCount: 0,
    invalidProviderTeamsCount: 0,
  };
};
