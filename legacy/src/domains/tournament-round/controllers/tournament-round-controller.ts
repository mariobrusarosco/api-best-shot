/**
 * Tournament Round Controller
 *
 * Handles request orchestration for tournament round operations
 */

import { API_TOURNAMENT_ROUND } from '../api';

export class TournamentRoundController {
  static getAllRounds = API_TOURNAMENT_ROUND.getAllRounds;
  static getRound = API_TOURNAMENT_ROUND.getRound;
  static getKnockoutRounds = API_TOURNAMENT_ROUND.getKnockoutRounds;
  static createTournamentRounds = API_TOURNAMENT_ROUND.createTournamentRounds;
}
