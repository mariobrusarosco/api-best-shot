import type {
  KnockoutRoundsSyncReport,
  KnockoutRoundsSyncReportUploadResult,
} from '@/domains/data-provider-v2/contracts/knockout-rounds-sync';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';
import { KNOCKOUT_ROUNDS_SYNC_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const uploadKnockoutRoundsSyncReport = async (
  report: KnockoutRoundsSyncReport
): Promise<KnockoutRoundsSyncReportUploadResult> => {
  return uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: KNOCKOUT_ROUNDS_SYNC_EXECUTION_OPERATION_TYPE,
    tournamentId: report.tournament.tournamentId,
    failureMessage: 'Failed to upload tournament knockout rounds sync report',
  });
};
