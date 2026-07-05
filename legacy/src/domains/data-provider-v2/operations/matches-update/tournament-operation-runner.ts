import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  MatchesTournamentContext,
  MatchesUpdateReportUploadResult,
  MatchesUpdateWorkflowStatus,
  TournamentMatchesUpdateSummary,
  TournamentMatchesUpdateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/matches';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { PlaywrightRuntime } from '@/domains/data-provider-v2/transport/playwright/runtime';
import { randomUUID } from 'crypto';
import { runTournamentMatchesUpdate } from '@/domains/data-provider-v2/use-cases/matches/run-tournament-matches-update';
import {
  createMatchesUpdateExecutionJob,
  failMatchesUpdateExecutionJob,
  finalizeMatchesUpdateExecutionJob,
  type MatchesUpdateExecutionJob,
} from './execution-job-store';
import {
  buildMatchesUpdateDetails,
  buildMatchesUpdateReport,
  buildMatchesUpdateReportData,
  buildMatchesUpdateSummary,
  deriveMatchesUpdateWorkflowStatus,
  mergeMatchesUpdateSummaryWithReportUpload,
} from './report-builder';
import { uploadMatchesUpdateReport } from './report-uploader';
import { notifyMatchesUpdateExecution } from './slack-notifier';

export type MatchesUpdateOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: MatchesUpdateWorkflowStatus;
  summary: TournamentMatchesUpdateSummary;
  reportUpload?: MatchesUpdateReportUploadResult;
  result: TournamentMatchesUpdateWorkflowResult;
  executionJob: MatchesUpdateExecutionJob;
};

export const runTournamentMatchesUpdateOperation = async (input: {
  tournament: MatchesTournamentContext;
  requestId?: string;
  startedAt?: Date;
}): Promise<MatchesUpdateOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  let executionJobCreated = false;
  let runtime: PlaywrightRuntime | null = null;
  let matchesResult: TournamentMatchesUpdateWorkflowResult | null = null;
  let reportUpload: MatchesUpdateReportUploadResult | undefined;

  try {
    await createMatchesUpdateExecutionJob({
      requestId,
      tournamentId: input.tournament.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    runtime = await PlaywrightRuntime.create();
    const session = await runtime.createSession();

    try {
      matchesResult = await runTournamentMatchesUpdate({
        tournament: input.tournament,
        roundProvider: SofaScoreRoundProvider.fromSession(session),
      });
    } finally {
      await session.close();
    }

    const completedAt = new Date();
    const status = deriveMatchesUpdateWorkflowStatus(matchesResult);
    const summary = buildMatchesUpdateSummary(matchesResult);
    const details = buildMatchesUpdateDetails(matchesResult);
    const data = buildMatchesUpdateReportData(matchesResult);
    const report = buildMatchesUpdateReport({
      requestId,
      result: matchesResult,
      startedAt,
      completedAt,
      status,
      summary,
      details,
      data,
    });

    reportUpload = await uploadMatchesUpdateReport(report);

    const summaryWithReportUpload = mergeMatchesUpdateSummaryWithReportUpload({
      summary,
      reportUpload,
    });

    const finalizedExecutionJob = await finalizeMatchesUpdateExecutionJob({
      requestId,
      status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary: summaryWithReportUpload,
    });

    if (!finalizedExecutionJob) {
      throw new Error(`Matches update execution finalization returned no row for requestId=${requestId}`);
    }

    await notifyMatchesUpdateExecution({
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
    const fallbackSummary = matchesResult ? buildMatchesUpdateSummary(matchesResult) : createFallbackSummary();
    const fallbackSummaryWithReportUpload = reportUpload
      ? mergeMatchesUpdateSummaryWithReportUpload({
          summary: fallbackSummary,
          reportUpload,
        })
      : fallbackSummary;

    if (executionJobCreated) {
      try {
        await failMatchesUpdateExecutionJob({
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
          operation: 'runTournamentMatchesUpdateOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournament.tournamentId,
        });
      }
    }

    await notifyMatchesUpdateExecution({
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

const createFallbackSummary = (): TournamentMatchesUpdateSummary => {
  return {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    roundsRequested: 0,
    fetchedRounds: 0,
    fetchedMatches: 0,
    upsertedMatches: 0,
    createdMatches: 0,
    updatedMatches: 0,
    blockedByMissingTeamsCount: 0,
    missingRoundsPrerequisiteCount: 0,
    providerIssuesCount: 0,
    invalidProviderMatchesCount: 0,
  };
};
