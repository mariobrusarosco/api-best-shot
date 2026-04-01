import type {
  MatchesUpdateReport,
  MatchesUpdateReportUploadResult,
} from '@/domains/data-provider-v2/contracts/matches';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';

export const uploadMatchesUpdateReport = async (
  report: MatchesUpdateReport
): Promise<MatchesUpdateReportUploadResult> => {
  return await uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: report.operationType,
    tournamentId: report.tournament.tournamentId,
    failureMessage: `Matches update report upload failed for requestId=${report.requestId}`,
  });
};
