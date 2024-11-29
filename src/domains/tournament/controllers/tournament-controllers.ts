import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';

const mock = [
  {
    id: 322344,
    data_realizacao: '2025-04-19T12:00',
    hora_realizacao: null,
    placar_oficial_visitante: null,
    placar_oficial_mandante: null,
    placar_penaltis_visitante: null,
    placar_penaltis_mandante: null,
    equipes: {
      mandante: {
        id: 2666,
        nome_popular: 'Aston Villa',
        sigla: 'ASV',
        escudo: 'https://s.sde.globo.com/media/organizations/2023/12/05/Aston_Villa.svg',
      },
      visitante: {
        id: 2680,
        nome_popular: 'Newcastle',
        sigla: 'NEW',
        escudo:
          'https://s.sde.globo.com/media/organizations/2023/09/04/Newcastle_United.svg',
      },
    },
    sede: {
      nome_popular: 'Villa Park',
    },
    transmissao: null,
    jogo_ja_comecou: null,
  },
  {
    id: 322345,
    data_realizacao: '2025-04-19T12:00',
    hora_realizacao: null,
    placar_oficial_visitante: null,
    placar_oficial_mandante: null,
    placar_penaltis_visitante: null,
    placar_penaltis_mandante: null,
    equipes: {
      mandante: {
        id: 4435,
        nome_popular: 'Brentford',
        sigla: 'BRE',
        escudo: 'https://s.sde.globo.com/media/organizations/2024/02/19/Brentford.svg',
      },
      visitante: {
        id: 4436,
        nome_popular: 'Brighton',
        sigla: 'BFC',
        escudo:
          'https://s.sde.globo.com/media/organizations/2024/04/25/Brighton_xcDfo4Q.svg',
      },
    },
    sede: {
      nome_popular: 'Brentford Community Stadium',
    },
    transmissao: null,
    jogo_ja_comecou: null,
  },
  {
    id: 322346,
    data_realizacao: '2025-04-19T12:00',
    hora_realizacao: null,
    placar_oficial_visitante: null,
    placar_oficial_mandante: null,
    placar_penaltis_visitante: null,
    placar_penaltis_mandante: null,
    equipes: {
      mandante: {
        id: 3675,
        nome_popular: 'Crystal Palace',
        sigla: 'CPA',
        escudo:
          'https://s.sde.globo.com/media/organizations/2024/09/20/Crystal_Palace_FC.svg',
      },
      visitante: {
        id: 4224,
        nome_popular: 'Bournemouth',
        sigla: 'BOU',
        escudo:
          'https://s.sde.globo.com/media/organizations/2024/11/01/AFC_Bournemouth_2013_1.svg',
      },
    },
    sede: {
      nome_popular: 'Selhurst Park ',
    },
    transmissao: null,
    jogo_ja_comecou: null,
  },
  {
    id: 322347,
    data_realizacao: '2025-04-19T12:00',
    hora_realizacao: null,
    placar_oficial_visitante: null,
    placar_oficial_mandante: null,
    placar_penaltis_visitante: null,
    placar_penaltis_mandante: null,
    equipes: {
      mandante: {
        id: 2668,
        nome_popular: 'Everton',
        sigla: 'EVE',
        escudo: 'https://s.sde.globo.com/media/organizations/2017/10/22/Everton-65.png',
      },
      visitante: {
        id: 2665,
        nome_popular: 'Manchester City',
        sigla: 'MAC',
        escudo:
          'https://s.sde.globo.com/media/organizations/2018/03/11/manchester-city.svg',
      },
    },
    sede: {
      nome_popular: 'Goodison Park',
    },
    transmissao: null,
    jogo_ja_comecou: null,
  },
  {
    id: 322348,
    data_realizacao: '2025-04-19T12:00',
    hora_realizacao: null,
    placar_oficial_visitante: null,
    placar_oficial_mandante: null,
    placar_penaltis_visitante: null,
    placar_penaltis_mandante: null,
    equipes: {
      mandante: {
        id: 2673,
        nome_popular: 'Fulham',
        sigla: 'FUL',
        escudo:
          'https://s.sde.globo.com/media/organizations/2024/10/04/fulham-svg-72605.svg',
      },
      visitante: {
        id: 2661,
        nome_popular: 'Chelsea',
        sigla: 'CHE',
        escudo: 'https://s.sde.globo.com/media/teams/2018/03/11/chelsea.svg',
      },
    },
    sede: {
      nome_popular: 'Craven Cottage',
    },
    transmissao: null,
    jogo_ja_comecou: null,
  },
  {
    id: 322349,
    data_realizacao: '2025-04-19T12:00',
    hora_realizacao: null,
    placar_oficial_visitante: null,
    placar_oficial_mandante: null,
    placar_penaltis_visitante: null,
    placar_penaltis_mandante: null,
    equipes: {
      mandante: {
        id: 6400,
        nome_popular: 'Ipswich',
        sigla: 'IPT',
        escudo:
          'https://s.sde.globo.com/media/organizations/2022/12/22/65_0008_ipswich-town-57735.png',
      },
      visitante: {
        id: 2663,
        nome_popular: 'Arsenal',
        sigla: 'ARS',
        escudo: 'https://s.sde.globo.com/media/teams/2018/03/11/arsenal.svg',
      },
    },
    sede: {
      nome_popular: 'Portman Road',
    },
    transmissao: null,
    jogo_ja_comecou: null,
  },
  {
    id: 322350,
    data_realizacao: '2025-04-19T12:00',
    hora_realizacao: null,
    placar_oficial_visitante: null,
    placar_oficial_mandante: null,
    placar_penaltis_visitante: null,
    placar_penaltis_mandante: null,
    equipes: {
      mandante: {
        id: 2936,
        nome_popular: 'Leicester',
        sigla: 'LEI',
        escudo: 'https://s.sde.globo.com/media/teams/2014/07/22/lei65.png',
      },
      visitante: {
        id: 2667,
        nome_popular: 'Liverpool',
        sigla: 'LIV',
        escudo:
          'https://s.sde.globo.com/media/organizations/2024/10/05/liverpool-svg-72634.svg',
      },
    },
    sede: {
      nome_popular: 'Leicester Stadium',
    },
    transmissao: null,
    jogo_ja_comecou: null,
  },
  {
    id: 322351,
    data_realizacao: '2025-04-19T12:00',
    hora_realizacao: null,
    placar_oficial_visitante: null,
    placar_oficial_mandante: null,
    placar_penaltis_visitante: null,
    placar_penaltis_mandante: null,
    equipes: {
      mandante: {
        id: 2662,
        nome_popular: 'Manchester United',
        sigla: 'MAN',
        escudo: 'https://s.sde.globo.com/media/teams/2018/03/11/manchester-united.svg',
      },
      visitante: {
        id: 2677,
        nome_popular: 'Wolverhampton',
        sigla: 'WOL',
        escudo:
          'https://s.sde.globo.com/media/organizations/2024/09/27/Wolverhampton.svg',
      },
    },
    sede: {
      nome_popular: 'Old Trafford',
    },
    transmissao: null,
    jogo_ja_comecou: null,
  },
  {
    id: 322352,
    data_realizacao: '2025-04-19T12:00',
    hora_realizacao: null,
    placar_oficial_visitante: null,
    placar_oficial_mandante: null,
    placar_penaltis_visitante: null,
    placar_penaltis_mandante: null,
    equipes: {
      mandante: {
        id: 2664,
        nome_popular: 'Tottenham',
        sigla: 'TOT',
        escudo: 'https://s.sde.globo.com/media/organizations/2018/03/11/tottenham.svg',
      },
      visitante: {
        id: 3971,
        nome_popular: 'Nottingham Forest',
        sigla: 'NOT',
        escudo:
          'https://s.sde.globo.com/media/organizations/2024/02/27/nottingham_forest.svg',
      },
    },
    sede: {
      nome_popular: 'Tottenham Hotspur Stadium',
    },
    transmissao: null,
    jogo_ja_comecou: null,
  },
  {
    id: 322353,
    data_realizacao: '2025-04-19T12:00',
    hora_realizacao: null,
    placar_oficial_visitante: null,
    placar_oficial_mandante: null,
    placar_penaltis_visitante: null,
    placar_penaltis_mandante: null,
    equipes: {
      mandante: {
        id: 2679,
        nome_popular: 'West Ham',
        sigla: 'WTH',
        escudo: 'https://s.sde.globo.com/media/organizations/2023/06/06/west-ham-svg.svg',
      },
      visitante: {
        id: 3488,
        nome_popular: 'Southampton',
        sigla: 'SOU',
        escudo:
          'https://s.sde.globo.com/media/organizations/2024/02/27/Southampton_FC.svg.svg',
      },
    },
    sede: {
      nome_popular: 'Olímpico de Londres',
    },
    transmissao: null,
    jogo_ja_comecou: null,
  },
];

import { ACTIVE_PROVIDER, ApiProvider } from '@/domains/data-providers';
import {} from '@/domains/data-providers/typing';
import { ErrorMapper } from '@/domains/tournament/error-handling/mapper';
import { InsertTournament, TTournament } from '@/domains/tournament/schema';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

async function getTournament(req: Request, res: Response) {
  try {
    const tournamentId = req?.params.tournamentId;
    const [tournament] = await db
      .select()
      .from(TTournament)
      .where(
        and(eq(TTournament.id, tournamentId), eq(TTournament.provider, ACTIVE_PROVIDER))
      );

    return res.status(200).send(tournament);
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return handleInternalServerErrorResponse(res, error);
  }
}

async function getAllTournaments(_: Request, res: Response) {
  try {
    const result = await db
      .select()
      .from(TTournament)
      .where(eq(TTournament.provider, ACTIVE_PROVIDER));

    return res.status(200).send(result);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

async function createTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const body = req?.body as InsertTournament & { provider: string };

    if (!body.label) {
      res
        .status(ErrorMapper.MISSING_LABEL.status)
        .json({ message: ErrorMapper.MISSING_LABEL.user });

      return;
    }

    const [tournament] = await ApiProvider.tournament.createOnDB(body);

    if (!tournament)
      return res
        .status(ErrorMapper.NO_TOURNAMENT_CREATED.status)
        .json({ message: ErrorMapper.NO_TOURNAMENT_CREATED.user });

    let ROUND = 1;

    while (ROUND <= Number(5)) {
      const url = ApiProvider.rounds.prepareUrl({
        externalId: body.externalId,
        slug: body.slug,
        mode: body.mode,
        round: ROUND,
        season: body.season,
      });

      const roundOfMatchesFromApi = await ApiProvider.rounds.fetchRound(url);

      const matches = roundOfMatchesFromApi.map(rawMatch =>
        ApiProvider.match.parse({
          match: rawMatch,
          roundId: ROUND,
          tournamentExternalId: body.externalId,
        })
      );

      const createdMatches = await ApiProvider.match.insertMatchesOnDB(matches);
      console.log('CREATED MATCHES: ', { createdMatches });
      //     await Provider.upsertTeamOnDatabase(match.teams.home);
      //     await Provider.upsertTeamOnDatabase(match.teams.away);

      ROUND++;
    }

    return res.json(tournament);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

async function updateTournamentFromExternalSource(req: Request, res: Response) {
  try {
    const body = req?.body as InsertTournament & { provider: string };
    // const updatedTournament = await ApiProvider.tournament.updateOnDB(body);

    // if (!updatedTournament) {
    //   return res
    //     .status(ErrorMapper.NO_TOURNAMENT_UPDATED.status)
    //     .json({ message: ErrorMapper.NO_TOURNAMENT_UPDATED.user });
    // }

    let ROUND = 1;

    while (ROUND <= Number(5)) {
      const url = ApiProvider.rounds.prepareUrl({
        externalId: body.externalId,
        slug: body.slug,
        mode: body.mode,
        round: ROUND,
        season: body.season,
      });

      const roundOfMatchesFromApi = await ApiProvider.rounds.fetchRound(url);

      const matches = roundOfMatchesFromApi.map(rawMatch =>
        ApiProvider.match.parse({
          match: rawMatch,
          roundId: ROUND,
          tournamentExternalId: body.externalId,
        })
      );

      await ApiProvider.match.updateMatchesOnDB(matches);

      ROUND++;
    }

    return res.json('ok');
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

const TournamentController = {
  getTournament,
  getAllTournaments,
  updateTournamentFromExternalSource,
  createTournamentFromExternalSource,
};

export default TournamentController;
