import { SofascoreTeams } from '@/domains/data-provider/providers/sofascore//teams';
import { SofascoreTournamentRound } from '@/domains/data-provider/providers/sofascore/tournament-rounds';
import { SofascoreTournament } from '@/domains/data-provider/providers/sofascore/tournaments';

export const API_Sofascore = {
  tournament: SofascoreTournament,
  round: SofascoreTournamentRound,
  teams: SofascoreTeams,
};
