import type { RoundsCreateReport, RoundsCreateReportUploadResult } from '@/domains/data-provider-v2/contracts/rounds';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';
import { ROUNDS_CREATE_EXECUTION_OPERATION_TYPE } from './execution-job-store';

export const uploadRoundsCreateReport = async (report: RoundsCreateReport): Promise<RoundsCreateReportUploadResult> => {
  return uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: ROUNDS_CREATE_EXECUTION_OPERATION_TYPE,
    tournamentId: report.tournament.tournamentId,
    failureMessage: 'Failed to upload rounds create report',
  });
};
