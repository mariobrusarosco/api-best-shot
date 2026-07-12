import { buildPublicAssetUrl } from '../../../../platform/assets/public-asset-url';
import { listWorldCupEditionRecords } from './repository';

export type WorldCupEditionListItem = {
  id: string;
  year: number;
  name: string;
  logoUrl: string | null;
  host: {
    displayName: string;
  };
};

export const listWorldCupEditions = async (): Promise<WorldCupEditionListItem[]> => {
  const editions = await listWorldCupEditionRecords();

  return editions.map(edition => ({
    id: edition.id,
    year: edition.year,
    name: edition.name,
    logoUrl: buildPublicAssetUrl(edition.logoAssetKey),
    host: {
      displayName: edition.hostDisplayName,
    },
  }));
};
