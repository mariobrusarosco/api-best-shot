import { IApiProvider } from '@/domains/data-provider/typing';
import { DB_InsertMatch } from '@/domains/match/schema';
import { safeString } from '@/utils';
import { API_SofaScoreRound } from './typing';

const safeSofaDate = (date: any) => {
  return date === null || date === undefined ? null : new Date(date);
};

export const SofascoreMatches: IApiProvider['matches'] = {
  // fetchRoundMatches: async (baseUrl, round) => {
  //   const parsedRoundsUrl = baseUrl + `${String(round)}`;

  //   const apiResponse = await axios.get(parsedRoundsUrl);

  //   return apiResponse.data;
  // },
  mapRoundMatches: ({ round, roundSlug, tournamentId }) => {
    return round.events.map(match => {
      return {
        externalId: String(match.id),
        provider: 'sofa',
        tournamentId,
        roundId: roundSlug,
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
