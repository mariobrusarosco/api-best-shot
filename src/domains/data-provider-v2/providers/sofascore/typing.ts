export type API_SofaScoreMatch = {
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

export type API_SofaScoreRound = {
  events: API_SofaScoreMatch[];
  hasPreviousPage: boolean;
};

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

export type API_SofaScoreRounds = {
  currentRound: {
    round: number;
  };
  rounds: {
    round: number;
    name?: string;
    slug?: string;
    prefix?: string;
  }[];
};

export const SOFA_MATCHES_URL =
  'https://www.sofascore.com/api/v1/:mode/:external_id/season/:season/events/round/:round';

export const SOFA_TOURNAMENT_URL =
  'https://www.sofascore.com/api/v1/:mode/:external_id/season/:season/standings/total';

export const SOFA_TOURNAMENT_LOGO_URL =
  'https://img.sofascore.com/api/v1/:mode/:external_id/image/dark';

const TOURNAMENTS_METADATA = {
  BRASILEIRAO_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/325/season/58766/events/round',
    externalId: 325,
    seasonId: 58766,
  },
  LALIGA_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/8/season/61643/events/round',
    externalId: 8,
    seasonId: 61643,
  },
  PREMIER_LEAGUE_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/17/season/61627/events/round',
    externalId: 17,
    seasonId: 61627,
  },
  BUNDESLIGA_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/35/season/63516/events/round',
    externalId: 35,
    seasonId: 63516,
  },
  SERIE_A_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/23/season/63515/events/round',
    externalId: 23,
    seasonId: 63515,
  },
  CONMEBOL_QUALIFIERS_26: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/295/season/53820/events/round',
    externalId: 295,
    seasonId: 53820,
  },
};
