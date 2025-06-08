export interface ENDPOINT_STANDINGS {
  standings: Array<{
    tournament: {
      name: string;
      slug: string;
      category: {
        id: number;
        country: {
          alpha2: string;
          alpha3: string;
          name: string;
          slug: string;
        };
        name: string;
        slug: string;
        sport: {
          name: string;
          slug: string;
          id: number;
        };
        flag: string;
        alpha2: string;
      };
      uniqueTournament: {
        name: string;
        slug: string;
        primaryColorHex: string;
        secondaryColorHex: string;
        category: {
          id: number;
          country: {
            alpha2: string;
            alpha3: string;
            name: string;
            slug: string;
          };
          name: string;
          slug: string;
          sport: {
            name: string;
            slug: string;
            id: number;
          };
          flag: string;
          alpha2: string;
        };
        userCount: number;
        hasPerformanceGraphFeature: boolean;
        id: number;
        country: Record<string, never>; // Empty object
        displayInverseHomeAwayTeams: boolean;
      };
      priority: number;
      isGroup: boolean;
      isLive: boolean;
      id: number;
    };
    name: string;
    type: string;
    descriptions: Array<never>; // Empty array
    tieBreakingRule: {
      text: string;
      id: number;
    };
    rows: Array<{
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
        country: {
          alpha2: string;
          alpha3: string;
          name: string;
          slug: string;
        };
        teamColors: {
          primary: string;
          secondary: string;
          text: string;
        };
        fieldTranslations: {
          nameTranslation: Record<string, string>;
          shortNameTranslation: Record<string, never>; // Empty object
        };
      };
      descriptions: Array<never>; // Empty array
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
    }>;
    id: number;
    updatedAtTimestamp: number;
  }>;
}

export interface ENDPOINT_ROUNDS {
  currentRound: {
    round: number;
    name?: string;
    slug?: string;
    prefix?: string;
  };
  rounds: Array<{
    round: number;
    name?: string;
    slug?: string;
    prefix?: string;
  }>;
}

export interface ENDPOINT_MATCHES {
  events: Array<{
    tournament: {
      name: string;
      slug: string;
      category: {
        id: number;
        country: {
          alpha2: string;
          alpha3: string;
          name: string;
          slug: string;
        };
        name: string;
        slug: string;
        sport: {
          name: string;
          slug: string;
          id: number;
        };
        flag: string;
        alpha2: string;
      };
      uniqueTournament: {
        name: string;
        slug: string;
        primaryColorHex: string;
        secondaryColorHex: string;
        category: {
          id: number;
          country: {
            alpha2: string;
            alpha3: string;
            name: string;
            slug: string;
          };
          name: string;
          slug: string;
          sport: {
            name: string;
            slug: string;
            id: number;
          };
          flag: string;
          alpha2: string;
        };
        userCount: number;
        hasPerformanceGraphFeature: boolean;
        id: number;
        country: Record<string, never>; // Empty object
        hasEventPlayerStatistics: boolean;
        displayInverseHomeAwayTeams: boolean;
      };
      priority: number;
      isGroup: boolean;
      isLive: boolean;
      id: number;
    };
    season: {
      name: string;
      year: string;
      editor: boolean;
      id: number;
    };
    roundInfo: {
      round: number;
    };
    customId: string;
    status: {
      code: number;
      description: string;
      type: string;
    };
    winnerCode: number;
    homeTeam: {
      id: number;
      country: {
        alpha2: string;
        alpha3: string;
        name: string;
        slug: string;
      };
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
      subTeams: Array<never>; // Empty array
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
    awayTeam: {
      id: number;
      country: {
        alpha2: string;
        alpha3: string;
        name: string;
        slug: string;
      };
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
      subTeams: Array<never>; // Empty array
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
    homeScore: {
      current: number;
      display: number;
      period1: number;
      period2: number;
      normaltime: number;
      penalties: number;
      overtime: number;
    };
    awayScore: {
      current: number;
      display: number;
      period1: number;
      period2: number;
      normaltime: number;
      penalties: number;
      overtime: number;
    };
    time: {
      injuryTime1: number;
      injuryTime2: number;
      currentPeriodStartTimestamp: number;
    };
    changes: {
      changes: ['status.code', 'status.description', 'status.type'];
      changeTimestamp: number;
    };
    hasGlobalHighlights: boolean;
    hasXg: boolean;
    hasEventPlayerStatistics: boolean;
    hasEventPlayerHeatMap: boolean;
    detailId: number;
    crowdsourcingDataDisplayEnabled: boolean;
    id: number;
    slug: string;
    startTimestamp: number;
    finalResultOnly: boolean;
    feedLocked: boolean;
    isEditor: boolean;
  }>;
}
