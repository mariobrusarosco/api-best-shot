export type API_SofaScoreStandings = {
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
      groupName: string;
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
    rows: API_SofascoreStandingTeam[];
    id: number;
    updatedAtTimestamp: number;
  }[];
};

export type API_SofascoreStandingTeam = {
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
};
