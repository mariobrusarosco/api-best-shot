import { countWorldCupEditions } from '../editions/service';

const aboutAndEditionsPageNumber = 3;
const firstEditionDetailPageNumber = 4;

export type ContentItem = {
  label: string;
  path: string;
  pageNumber: number;
};

export const listContents = async (): Promise<ContentItem[]> => {
  const editionCount = await countWorldCupEditions();

  return [
    {
      label: 'About the tournament',
      path: '/about',
      pageNumber: aboutAndEditionsPageNumber,
    },
    {
      label: 'Editions',
      path: '/editions',
      pageNumber: aboutAndEditionsPageNumber,
    },
    {
      label: 'Teams',
      path: '/teams',
      pageNumber: firstEditionDetailPageNumber + editionCount,
    },
  ];
};
