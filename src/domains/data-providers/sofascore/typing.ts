export type IMatch = {
  externalId: number;
  roundId: number;
  tournamentId: string;
  home: {
    id: number;
    name: string;
    shortName: string;
    nameCode: string;
    score: number | null;
    externalId: number;
  };
  away: {
    id: number;
    name: string;
    shortName: string;
    nameCode: string;
    score: number | null;
    externalId: number;
  };
  date: Date | null;
  status?: string;
};

export type SofaScoreMatchApi = {
  id: number;
  slug: string;
  roundInfo: {
    round: number;
  };
  startTimestamp: number | null;
  tournament: {
    uniqueTournament: {
      id: number;
    };
  };
  status: {
    description: string;
    type: string;
    code: number;
  };
  winnerCode: number | null;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    slug: string;
    nameCode: string;
    teamColors: {
      primary: string;
      secondary: string;
      text: string;
    };
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    slug: string;
    nameCode: string;
    teamColors: {
      primary: string;
      secondary: string;
      text: string;
    };
  };
  homeScore: {
    current: number;
    display: number;
    period1: number;
    period2: number;
    normaltime: number;
  };
  awayScore: {
    current: number;
    display: number;
    period1: number;
    period2: number;
    normaltime: number;
  };
};

export type SofaScoreRoundApi = {
  events: SofaScoreMatchApi[];
  hasPreviousPage: boolean;
};

export type SofaScorestandings = {
  standings: [
    {
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
      rows: [
        {
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
      ];
      id: number;
      updatedAtTimestamp: number;
    }
  ];
};
