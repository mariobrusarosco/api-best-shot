export type TournamentSourceRecord = {
  id: string;
  year: number;
  name: string;
  hostCountry: string;
  winner: string;
  startDate: string;
  endDate: string;
  teamCount: number;
};

export type SeededEdition = {
  id: string;
  year: number;
};
