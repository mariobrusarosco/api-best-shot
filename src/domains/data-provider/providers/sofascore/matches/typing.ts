type API_SofaScoreMatch = {
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
