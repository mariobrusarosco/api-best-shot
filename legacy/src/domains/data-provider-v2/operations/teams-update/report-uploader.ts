import type { TeamsUpdateReport, TeamsUpdateReportUploadResult } from '@/domains/data-provider-v2/contracts/teams';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';

export const uploadTeamsUpdateReport = async (report: TeamsUpdateReport): Promise<TeamsUpdateReportUploadResult> => {
  return await uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: report.operationType,
    tournamentId: report.tournament.tournamentId,
    failureMessage: `Teams update report upload failed for requestId=${report.requestId}`,
  });
};
