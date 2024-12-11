import { DB_InsertMatch } from '@/domains/match/schema';
import { safeDate, safeString } from '@/utils';
import axios from 'axios';
import { IApiProviderV2 } from '../../interface';
import { API_GloboEsporteRound } from './typing';

export const GloboEsporteMatches: IApiProviderV2['matches'] = {
  fetchRound: async (url, round) => {
    const parsedRoundsUrl = url.replace('[round]', String(round));

    const apiResponse = await axios.get(parsedRoundsUrl);

    return apiResponse.data;
  },
  mapRound: (round: API_GloboEsporteRound, roundId, tournamentId) => {
    return round.map(match => {
      return {
        externalId: String(match.id),
        provider: 'ge',
        tournamentId,
        tournamentExternalId: '',
        roundId,
        homeTeamId: String(match.equipes.mandante.id),
        homeScore: safeString(match.placar_oficial_mandante),
        awayTeamId: String(match.equipes.visitante.id),
        awayScore: safeString(match.placar_oficial_visitante),
        date: safeDate(match.data_realizacao),
        time: safeString(match.hora_realizacao),
        stadium: safeString(match?.sede?.nome_popular),
        status: getMatchStatus(match),
      } as DB_InsertMatch;
    });
  },
};

const getMatchStatus = (match: API_GloboEsporteRound[number]) => {
  const matchHasNoPlayStatus = match.jogo_ja_comecou === null;
  const matchHasNoDate = match.data_realizacao === null;

  if (matchHasNoDate && matchHasNoPlayStatus) return 'not-defined';
  if (match.jogo_ja_comecou === true) return 'ended';
  return 'open';
};
