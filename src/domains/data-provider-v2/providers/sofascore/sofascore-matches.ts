import { DB_InsertMatch } from '@/domains/match/schema';
import { safeString } from '@/utils';
import { IApiProviderV2 } from '../../interface';
import { API_SofaScoreRound } from './typing';

const safeSofaDate = (date: any) => {
  return date === null || date === undefined ? null : new Date(date);
};

export const SofascoreMatches: IApiProviderV2['matches'] = {
  // fetchRoundMatches: async (baseUrl, round) => {
  //   const parsedRoundsUrl = baseUrl + `${String(round)}`;

  //   const apiResponse = await axios.get(parsedRoundsUrl);

  //   return apiResponse.data;
  // },
  mapRoundMatches: (round: API_SofaScoreRound, roundId, tournamentId) => {
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
        date: safeSofaDate(match.startTimestamp! * 1000),
        status: getMatchStatus(match),
      } as DB_InsertMatch;
    });
  },
};

const getMatchStatus = (match: API_SofaScoreRound['events'][number]) => {
  const matchWasPostponed = match.status.code === 60;
  const matcheEnded = match.status.code === 100;

  if (matchWasPostponed) return 'not-defined';
  if (matcheEnded) return 'ended';
  return 'open';
};
