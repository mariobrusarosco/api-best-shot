export type TeamOnStandings = {
  externalId: string;
  position: number;
  matches: number;
  wins: number;
  points: number;
};

export interface TournamentStandings {
  teams: TeamOnStandings;
}
