import type {
  TournamentUpdateReport,
  TournamentUpdateReportUploadResult,
} from '@/domains/data-provider-v2/contracts/tournament-update';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';

export const uploadTournamentUpdateReport = async (
  report: TournamentUpdateReport
): Promise<TournamentUpdateReportUploadResult> => {
  return await uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: report.operationType,
    tournamentId: report.tournament.tournamentId,
    failureMessage: `Tournament update report upload failed for requestId=${report.requestId}`,
  });
};
