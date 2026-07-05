import type {
  StandingsUpdateReport,
  StandingsUpdateReportUploadResult,
} from '@/domains/data-provider-v2/contracts/standings';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';

export const uploadStandingsUpdateReport = async (
  report: StandingsUpdateReport
): Promise<StandingsUpdateReportUploadResult> => {
  return await uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: report.operationType,
    tournamentId: report.tournament.tournamentId,
    failureMessage: `Standings update report upload failed for requestId=${report.requestId}`,
  });
};
