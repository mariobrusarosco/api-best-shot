export interface API_SOFASCORE_STANDINGS {
  standings: {
    tournament: {
      name: string;
      slug: string;
      category: {
        name: string;
        slug: string;
        sport: {
          name: string;
          slug: string;
          id: number;
        };
        id: number;
        flag: string;
        alpha2: string;
      };
      uniqueTournament: {
        name: string;
        slug: string;
        primaryColorHex: string;
        secondaryColorHex: string;
        category: {
          name: string;
          slug: string;
          sport: {
            name: string;
            slug: string;
            id: number;
          };
          id: number;
          flag: string;
          alpha2: string;
        };
        userCount: number;
        hasPerformanceGraphFeature: boolean;
        id: number;
        displayInverseHomeAwayTeams: boolean;
      };
      priority: number;
      isGroup: boolean;
      isLive: boolean;
      id: number;
    };
    type: string;
    name: string;
    descriptions: [];
    tieBreakingRule: {
      text: string;
      id: number;
    };
    rows: API_SOFASCORE_STANDING_TEAM[];
    id: number;
    updatedAtTimestamp: number;
  }[];
}

export interface API_SOFASCORE_STANDING_TEAM {
  team: {
    name: string;
    slug: string;
    shortName: string;
    gender: string;
    sport: {
      name: string;
      slug: string;
      id: number;
    };
    userCount: number;
    nameCode: string;
    disabled: boolean;
    national: boolean;
    type: number;
    id: number;
    teamColors: {
      primary: string;
      secondary: string;
      text: string;
    };
    fieldTranslations: {
      nameTranslation: {
        ru: string;
      };
      shortNameTranslation: {};
    };
  };
  descriptions: [];
  promotion: {
    text: string;
    id: number;
  };
  position: number;
  matches: number;
  wins: number;
  scoresFor: number;
  scoresAgainst: number;
  id: number;
  losses: number;
  draws: number;
  points: number;
  scoreDiffFormatted: string;
}
