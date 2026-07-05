import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  MatchesCreateReportUploadResult,
  MatchesCreateWorkflowStatus,
  TournamentMatchesCreateSummary,
  TournamentMatchesCreateWorkflowResult,
  MatchesTournamentContext,
} from '@/domains/data-provider-v2/contracts/matches';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { PlaywrightRuntime } from '@/domains/data-provider-v2/transport/playwright/runtime';
import { randomUUID } from 'crypto';
import { runTournamentMatchesCreate } from '@/domains/data-provider-v2/use-cases/matches/run-tournament-matches-create';
import {
  createMatchesCreateExecutionJob,
  failMatchesCreateExecutionJob,
  finalizeMatchesCreateExecutionJob,
  type MatchesCreateExecutionJob,
} from './execution-job-store';
import {
  buildMatchesCreateDetails,
  buildMatchesCreateReport,
  buildMatchesCreateReportData,
  buildMatchesCreateSummary,
  deriveMatchesCreateWorkflowStatus,
  mergeMatchesCreateSummaryWithReportUpload,
} from './report-builder';
import { uploadMatchesCreateReport } from './report-uploader';
import { notifyMatchesCreateExecution } from './slack-notifier';

export type MatchesCreateOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: MatchesCreateWorkflowStatus;
  summary: TournamentMatchesCreateSummary;
  reportUpload?: MatchesCreateReportUploadResult;
  result: TournamentMatchesCreateWorkflowResult;
  executionJob: MatchesCreateExecutionJob;
};

export const runTournamentMatchesCreateOperation = async (input: {
  tournament: MatchesTournamentContext;
  requestId?: string;
  startedAt?: Date;
}): Promise<MatchesCreateOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  let executionJobCreated = false;
  let runtime: PlaywrightRuntime | null = null;
  let matchesResult: TournamentMatchesCreateWorkflowResult | null = null;
  let reportUpload: MatchesCreateReportUploadResult | undefined;

  try {
    await createMatchesCreateExecutionJob({
      requestId,
      tournamentId: input.tournament.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    runtime = await PlaywrightRuntime.create();
    const session = await runtime.createSession();

    try {
      matchesResult = await runTournamentMatchesCreate({
        tournament: input.tournament,
        roundProvider: SofaScoreRoundProvider.fromSession(session),
      });
    } finally {
      await session.close();
    }

    const completedAt = new Date();
    const status = deriveMatchesCreateWorkflowStatus(matchesResult);
    const summary = buildMatchesCreateSummary(matchesResult);
    const details = buildMatchesCreateDetails(matchesResult);
    const data = buildMatchesCreateReportData(matchesResult);
    const report = buildMatchesCreateReport({
      requestId,
      result: matchesResult,
      startedAt,
      completedAt,
      status,
      summary,
      details,
      data,
    });

    reportUpload = await uploadMatchesCreateReport(report);

    const summaryWithReportUpload = mergeMatchesCreateSummaryWithReportUpload({
      summary,
      reportUpload,
    });

    const finalizedExecutionJob = await finalizeMatchesCreateExecutionJob({
      requestId,
      status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary: summaryWithReportUpload,
    });

    if (!finalizedExecutionJob) {
      throw new Error(`Matches create execution finalization returned no row for requestId=${requestId}`);
    }

    await notifyMatchesCreateExecution({
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
      result: matchesResult,
      executionJob: finalizedExecutionJob,
    };
  } catch (error) {
    const completedAt = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fallbackSummary = matchesResult ? buildMatchesCreateSummary(matchesResult) : createFallbackSummary();
    const fallbackSummaryWithReportUpload = reportUpload
      ? mergeMatchesCreateSummaryWithReportUpload({
          summary: fallbackSummary,
          reportUpload,
        })
      : fallbackSummary;

    if (executionJobCreated) {
      try {
        await failMatchesCreateExecutionJob({
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
          operation: 'runTournamentMatchesCreateOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournament.tournamentId,
        });
      }
    }

    await notifyMatchesCreateExecution({
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

const createFallbackSummary = (): TournamentMatchesCreateSummary => {
  return {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    roundsRequested: 0,
    fetchedRounds: 0,
    fetchedMatches: 0,
    createdMatches: 0,
    skippedExistingMatches: 0,
    blockedByMissingTeamsCount: 0,
    missingRoundsPrerequisiteCount: 0,
    providerIssuesCount: 0,
    invalidProviderMatchesCount: 0,
  };
};
