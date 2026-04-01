import type {
  MatchesCreateReport,
  MatchesCreateReportUploadResult,
} from '@/domains/data-provider-v2/contracts/matches';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';

export const uploadMatchesCreateReport = async (
  report: MatchesCreateReport
): Promise<MatchesCreateReportUploadResult> => {
  return await uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: report.operationType,
    tournamentId: report.tournament.tournamentId,
    failureMessage: `Matches create report upload failed for requestId=${report.requestId}`,
  });
};
