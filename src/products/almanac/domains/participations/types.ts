export type ParticipationFinalPositionSource = 'official_raw' | 'derived_stage_stats';

export type WorldCupEditionTeamSourceRecord = {
  id: string;
  worldCupId: string;
  teamId: string;
  teamName: string;
  teamCode: string;
  stats: {
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
  };
  finish: {
    finalPosition: number;
    officialFinalPosition: number | null;
    finalPositionSource: ParticipationFinalPositionSource;
    finalStage: string;
  };
};
