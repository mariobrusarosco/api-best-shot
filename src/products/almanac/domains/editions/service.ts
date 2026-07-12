import { buildPublicAssetUrl } from '../../../../platform/assets/public-asset-url';
import { countWorldCupEditionRecords, listEditionIndexRecords } from './repository';

const firstEditionPageNumber = 4;

export type EditionIndexItem = {
  id: string;
  year: number;
  path: string;
  pageNumber: number;
  host: {
    displayName: string;
    flagUrl: string | null;
  };
};

export const listEditions = async (): Promise<EditionIndexItem[]> => {
  const editions = await listEditionIndexRecords();

  return editions.map((edition, index) => ({
    id: edition.id,
    year: edition.year,
    path: `/editions/${edition.year}`,
    pageNumber: firstEditionPageNumber + index,
    host: {
      displayName: edition.hostDisplayName,
      flagUrl: buildPublicAssetUrl(edition.hostFlagAssetKey),
    },
  }));
};

export const countWorldCupEditions = async (): Promise<number> => {
  return countWorldCupEditionRecords();
};
