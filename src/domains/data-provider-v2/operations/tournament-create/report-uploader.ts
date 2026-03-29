import type {
  TournamentCreateReport,
  TournamentCreateReportUploadResult,
} from '@/domains/data-provider-v2/contracts/tournament-create';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';

export const uploadTournamentCreateReport = async (
  report: TournamentCreateReport
): Promise<TournamentCreateReportUploadResult> => {
  return await uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: report.operationType,
    tournamentId: report.tournament.createdTournamentId ?? report.tournament.tournamentPublicId,
    failureMessage: `Tournament create report upload failed for requestId=${report.requestId}`,
  });
};
