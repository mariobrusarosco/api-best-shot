import type { TeamsCreateReport, TeamsCreateReportUploadResult } from '@/domains/data-provider-v2/contracts/teams';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';

export const uploadTeamsCreateReport = async (report: TeamsCreateReport): Promise<TeamsCreateReportUploadResult> => {
  return await uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: report.operationType,
    tournamentId: report.tournament.tournamentId,
    failureMessage: `Teams create report upload failed for requestId=${report.requestId}`,
  });
};
