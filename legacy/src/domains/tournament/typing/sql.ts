export interface RawTeam {
  name: string;
  shortName: string;
  externalId: string | number;
}

export interface RawMatch {
  externalId: string | number;
  roundSlug?: string;
  home: {
    id: string | number;
    score: string | number | null;
  };
  away: {
    id: string | number;
    score: string | number | null;
  };
  [key: string]: unknown;
}
