import type { RoundsUpdateReport, RoundsUpdateReportUploadResult } from '@/domains/data-provider-v2/contracts/rounds';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';
import { ROUNDS_UPDATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const uploadRoundsUpdateReport = async (report: RoundsUpdateReport): Promise<RoundsUpdateReportUploadResult> => {
  return uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: ROUNDS_UPDATE_EXECUTION_OPERATION_TYPE,
    tournamentId: report.tournament.tournamentId,
    failureMessage: 'Failed to upload rounds update report',
  });
};
