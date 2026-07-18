export type PlayerSourceRecord = {
  id: string;
  familyName: string;
  givenName: string | null;
  birthDate: string;
  positionFlags: {
    goalkeeper: boolean;
    defender: boolean;
    midfielder: boolean;
    forward: boolean;
  };
  countTournaments: number;
  wikipediaUrl: string;
};
