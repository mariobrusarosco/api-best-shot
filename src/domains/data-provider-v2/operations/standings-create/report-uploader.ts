import type {
  StandingsCreateReport,
  StandingsCreateReportUploadResult,
} from '@/domains/data-provider-v2/contracts/standings';
import { uploadJsonOperationReport } from '@/domains/data-provider-v2/operations/shared/upload-json-report';

export const uploadStandingsCreateReport = async (
  report: StandingsCreateReport
): Promise<StandingsCreateReportUploadResult> => {
  return await uploadJsonOperationReport({
    report,
    requestId: report.requestId,
    operationType: report.operationType,
    tournamentId: report.tournament.tournamentId,
    failureMessage: `Standings create report upload failed for requestId=${report.requestId}`,
  });
};
