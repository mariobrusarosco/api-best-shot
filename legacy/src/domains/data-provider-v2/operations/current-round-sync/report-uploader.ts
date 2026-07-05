import type {
  CurrentRoundSyncReport,
  CurrentRoundSyncReportUploadResult,
} from '@/domains/data-provider-v2/contracts/current-round-sync';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';
import { CURRENT_ROUND_SYNC_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const uploadCurrentRoundSyncReport = async (
  report: CurrentRoundSyncReport
): Promise<CurrentRoundSyncReportUploadResult> => {
  return uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: CURRENT_ROUND_SYNC_EXECUTION_OPERATION_TYPE,
    tournamentId: report.tournament.tournamentId,
    failureMessage: 'Failed to upload tournament current round sync report',
  });
};
