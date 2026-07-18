export type SquadPositionCode = 'GK' | 'DF' | 'MF' | 'FW';

export type WorldCupSquadPlayerSourceRecord = {
  id: string;
  worldCupId: string;
  teamId: string;
  playerId: string;
  familyName: string;
  givenName: string | null;
  shirtNumber: number | null;
  positionName: string;
  positionCode: SquadPositionCode;
};
