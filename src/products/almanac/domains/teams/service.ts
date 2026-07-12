import { buildPublicAssetUrl } from '../../../../platform/assets/public-asset-url';
import { countWorldCupEditions } from '../editions/service';
import { listNationalTeamRecords } from './repository';

const firstEditionPageNumber = 4;
const teamsIndexPageCount = 1;

export type TeamIndexItem = {
  id: string;
  code: string;
  displayName: string;
  path: string;
  pageNumber: number;
  flagUrl: string | null;
};

export const listTeams = async (): Promise<TeamIndexItem[]> => {
  const [teams, editionCount] = await Promise.all([
    listNationalTeamRecords(),
    countWorldCupEditions(),
  ]);
  const firstTeamPageNumber = firstEditionPageNumber + editionCount + teamsIndexPageCount;

  return teams.map((team, index) => ({
    id: team.id,
    code: team.code,
    displayName: team.displayName,
    path: `/teams/${team.code.toLowerCase()}`,
    pageNumber: firstTeamPageNumber + index,
    flagUrl: buildPublicAssetUrl(team.flagAssetKey),
  }));
};
