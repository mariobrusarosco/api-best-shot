import { DB_InsertMatch } from '@/domains/match/schema';
import { safeDate, safeString } from '@/utils';
import axios from 'axios';
import { IApiProviderV2 } from '../../interface';
import { API_SofaScoreRound } from './typing';

export const SofascoreMatches: IApiProviderV2['matches'] = {
  fetchRound: async (url, round) => {
    const parsedRoundsUrl = url + `${String(round)}`;

    const apiResponse = await axios.get(parsedRoundsUrl);

    return apiResponse.data;
  },
  mapRound: (round: API_SofaScoreRound, roundId, tournamentId) => {
    return round.events.map(match => {
      return {
        externalId: String(match.id),
        provider: 'sofa',
        tournamentId,
        roundId,
        homeTeamId: String(match.homeTeam.id),
        homeScore: safeString(match.homeScore.current),
        awayTeamId: String(match.awayTeam.id),
        awayScore: safeString(match.awayScore.current),
        date: safeDate(match.startTimestamp! * 1000),
        status: match.status.code === 100 ? 'ended' : 'open',
      } as DB_InsertMatch;
    });
  },
};
