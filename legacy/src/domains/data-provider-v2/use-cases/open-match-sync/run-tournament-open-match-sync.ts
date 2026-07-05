import type {
  OpenMatchSyncDueMatch,
  TournamentOpenMatchSyncDetails,
  TournamentOpenMatchSyncResult,
  TournamentOpenMatchSyncSummary,
} from '@/domains/data-provider-v2/contracts/open-match-sync';
import { SofaScoreMatchProvider } from '@/domains/data-provider-v2/providers/sofascore/match-provider';
import { touchMatchCheckedAt } from '@/domains/data-provider-v2/persistence/open-match-sync/touch-match-checked-at';
import { updateMatchFromPolling } from '@/domains/data-provider-v2/persistence/open-match-sync/update-match-from-polling';
import { classifyMatchSyncOutcome, type OpenMatchSyncClassification } from './classify-match-sync-outcome';

const SUMMARY_PREVIEW_LIMIT = 10;

export const runTournamentOpenMatchSync = async (input: {
  tournamentId: string;
  dueMatches: OpenMatchSyncDueMatch[];
  provider: SofaScoreMatchProvider;
}): Promise<TournamentOpenMatchSyncResult> => {
  const details = createEmptyDetails();
  const data = createEmptyReportData();
  const summary = createEmptySummary();

  for (const match of input.dueMatches) {
    const checkedAt = new Date();

    try {
      const payload = await input.provider.fetchMatchEvent({
        matchExternalId: match.externalId,
      });

      const classification = classifyMatchSyncOutcome({
        checkedAt,
        payload,
      });

      await applyClassification({
        match,
        checkedAt,
        classification,
        details,
        data,
        summary,
      });
    } catch (error) {
      const classification = classifyMatchSyncOutcome({ error });

      await applyClassification({
        match,
        checkedAt,
        classification,
        details,
        data,
        summary,
      });
    }
  }

  summary.totalOperations = input.dueMatches.length;
  summary.scannedMatches = input.dueMatches.length;
  summary.updatedMatchIdsPreview = data.updatedMatchIds.slice(0, SUMMARY_PREVIEW_LIMIT);
  summary.providerNotFoundMatchIdsPreview = data.providerNotFoundMatchIds.slice(0, SUMMARY_PREVIEW_LIMIT);
  summary.unexpectedFailureMatchIdsPreview = data.unexpectedFailureMatchIds.slice(0, SUMMARY_PREVIEW_LIMIT);

  return {
    tournamentId: input.tournamentId,
    status: deriveWorkflowStatus(summary),
    summary,
    details,
    data,
  };
};

const applyClassification = async (input: {
  match: OpenMatchSyncDueMatch;
  checkedAt: Date;
  classification: OpenMatchSyncClassification;
  details: TournamentOpenMatchSyncDetails;
  data: TournamentOpenMatchSyncResult['data'];
  summary: TournamentOpenMatchSyncSummary;
}): Promise<void> => {
  switch (input.classification.outcome) {
    case 'updated': {
      const updatedMatch = await updateMatchFromPolling({
        matchId: input.match.id,
        ...input.classification.pollingUpdate,
      });

      if (!updatedMatch) {
        await recordUnexpectedFailure({
          match: input.match,
          checkedAt: input.checkedAt,
          details: input.details,
          data: input.data,
          summary: input.summary,
          errorMessage: `Match "${input.match.id}" could not be updated from polling`,
        });
        return;
      }

      input.summary.successfulOperations++;
      input.summary.updatedMatches++;
      input.summary.endedMatches++;
      input.data.updatedMatchIds.push(updatedMatch.id);
      input.details.updated.push({
        matchId: updatedMatch.id,
        externalId: updatedMatch.externalId,
        roundSlug: input.match.roundSlug,
        providerStatus: input.classification.providerStatus,
        reason: 'updated',
      });
      return;
    }

    case 'provider_status_not_ended': {
      await touchMatchCheckedAt({
        matchId: input.match.id,
        checkedAt: input.checkedAt,
      });

      input.summary.successfulOperations++;
      input.summary.openMatches++;
      input.details.providerStatusNotEnded.push({
        matchId: input.match.id,
        externalId: input.match.externalId,
        roundSlug: input.match.roundSlug,
        providerStatus: input.classification.providerStatus,
        reason: 'provider_status_not_ended',
      });
      return;
    }

    case 'provider_status_postponed': {
      const updatedMatch = await updateMatchFromPolling({
        matchId: input.match.id,
        ...input.classification.pollingUpdate,
      });

      if (!updatedMatch) {
        await recordUnexpectedFailure({
          match: input.match,
          checkedAt: input.checkedAt,
          details: input.details,
          data: input.data,
          summary: input.summary,
          errorMessage: `Match "${input.match.id}" could not be updated as postponed`,
        });
        return;
      }

      input.summary.successfulOperations++;
      input.summary.postponedMatches++;
      input.data.postponedMatchIds.push(updatedMatch.id);
      input.details.providerStatusPostponed.push({
        matchId: updatedMatch.id,
        externalId: updatedMatch.externalId,
        roundSlug: input.match.roundSlug,
        providerStatus: input.classification.providerStatus,
        reason: 'provider_status_postponed',
      });
      return;
    }

    case 'provider_response_missing_event': {
      await touchMatchCheckedAt({
        matchId: input.match.id,
        checkedAt: input.checkedAt,
      });

      input.summary.successfulOperations++;
      input.summary.providerMissingEventMatches++;
      input.data.providerMissingEventMatchIds.push(input.match.id);
      input.details.providerResponseMissingEvent.push({
        matchId: input.match.id,
        externalId: input.match.externalId,
        roundSlug: input.match.roundSlug,
        reason: 'provider_response_missing_event',
      });
      return;
    }

    case 'provider_match_not_found': {
      input.summary.successfulOperations++;
      input.summary.providerNotFoundMatches++;
      input.data.providerNotFoundMatchIds.push(input.match.id);
      input.details.providerMatchNotFound.push({
        matchId: input.match.id,
        externalId: input.match.externalId,
        roundSlug: input.match.roundSlug,
        requestUrl: input.classification.requestUrl,
        reason: 'provider_match_not_found',
        errorMessage: input.classification.errorMessage,
        responseBodySnippet: input.classification.responseBodySnippet,
      });
      return;
    }

    case 'unexpected_failure': {
      await recordUnexpectedFailure({
        match: input.match,
        checkedAt: input.checkedAt,
        details: input.details,
        data: input.data,
        summary: input.summary,
        errorMessage: input.classification.errorMessage,
        requestUrl: input.classification.requestUrl,
        causeMessage: input.classification.causeMessage,
        responseBodySnippet: input.classification.responseBodySnippet,
      });
      return;
    }
  }
};

const recordUnexpectedFailure = async (input: {
  match: OpenMatchSyncDueMatch;
  checkedAt: Date;
  details: TournamentOpenMatchSyncDetails;
  data: TournamentOpenMatchSyncResult['data'];
  summary: TournamentOpenMatchSyncSummary;
  errorMessage: string;
  requestUrl?: string;
  causeMessage?: string;
  responseBodySnippet?: string;
}): Promise<void> => {
  await touchMatchCheckedAt({
    matchId: input.match.id,
    checkedAt: input.checkedAt,
  }).catch(() => undefined);

  input.summary.failedOperations++;
  input.summary.unexpectedFailureMatches++;
  input.data.unexpectedFailureMatchIds.push(input.match.id);
  input.details.unexpectedFailures.push({
    matchId: input.match.id,
    externalId: input.match.externalId,
    roundSlug: input.match.roundSlug,
    requestUrl: input.requestUrl,
    reason: 'unexpected_failure',
    errorMessage: input.errorMessage,
    causeMessage: input.causeMessage,
    responseBodySnippet: input.responseBodySnippet,
  });
};

const createEmptySummary = (): TournamentOpenMatchSyncSummary => {
  return {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    scannedMatches: 0,
    updatedMatches: 0,
    openMatches: 0,
    postponedMatches: 0,
    endedMatches: 0,
    providerNotFoundMatches: 0,
    providerMissingEventMatches: 0,
    unexpectedFailureMatches: 0,
  };
};

const createEmptyDetails = (): TournamentOpenMatchSyncDetails => {
  return {
    updated: [],
    providerStatusNotEnded: [],
    providerStatusPostponed: [],
    providerResponseMissingEvent: [],
    providerMatchNotFound: [],
    unexpectedFailures: [],
  };
};

const createEmptyReportData = (): TournamentOpenMatchSyncResult['data'] => {
  return {
    updatedMatchIds: [],
    postponedMatchIds: [],
    providerNotFoundMatchIds: [],
    providerMissingEventMatchIds: [],
    unexpectedFailureMatchIds: [],
  };
};

const deriveWorkflowStatus = (summary: TournamentOpenMatchSyncSummary): TournamentOpenMatchSyncResult['status'] => {
  if (summary.failedOperations === 0) {
    return 'completed';
  }

  if (summary.successfulOperations === 0) {
    return 'failed';
  }

  return 'partial_failure';
};
