import { ACTIVE_PROVIDER } from '@/domains/data-providers';
import { ErrorMapper } from '@/domains/match/error-handling/mapper';
import { TMatch } from '@/domains/match/schema';
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

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

// async function getMatch(req: Request, res: Response) {
//   const matchId = req?.params.matchId

//   try {
//     const match = await Match.findOne(
//       { _id: matchId },
//       {
//         __v: 0
//       }
//     )

//     return res.status(200).send(match)
//   } catch (error: any) {
//     if (error?.value === 'NULL') {
//       return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status)
//     } else {
//       // log here: ErrorMapper.INTERNAL_SERVER_ERROR.debug
//       res
//         .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
//         .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user)
//     }
//   }
// }

async function getMatchesByTournament(req: Request, res: Response) {
  try {
    const { round, tournamentId } = req?.params as {
      tournamentId: string;
      round: string;
    };

    console.log({ ACTIVE_PROVIDER, round, tournamentId });

    const matches = await db
      .select()
      .from(TMatch)
      .where(
        and(
          eq(TMatch.id, tournamentId),
          eq(TMatch.provider, ACTIVE_PROVIDER),
          eq(TMatch.roundId, round)
        )
      );

    if (!matches) {
      return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status);
    }

    res.status(200).send(matches);
  } catch (error: any) {
    // log here: ErrorMapper.INTERNAL_SERVER_ERROR.debug
    console.error('[TOURNAMENT] - [GET MACTHES BY TOURNAMENT]', error);

    return res
      .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
      .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
  }
}

// async function getAllTeamMatches(req: Request, res: Response) {
//   const teamId = req?.query.team
//   console.log({ teamId })

//   if (!teamId) {
//     return res
//       .status(ErrorMapper.NO_PROVIDED_TEAM_ABREVIATION.status)
//       .send(ErrorMapper.NO_PROVIDED_TEAM_ABREVIATION.user)
//   }

//   try {
//     const match = await Match.findOne(
//       { $or: [{ host: teamId }, { visitor: teamId }] },
//       {
//         __v: 0
//       }
//     )

//     return res.status(200).send(match)
//   } catch (error: any) {
//     if (error?.value === 'NULL') {
//       return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.status)
//     } else {
//       // log here: ErrorMapper.INTERNAL_SERVER_ERROR.debug
//       return res
//         .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
//         .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user)
//     }
//   }
// }

// async function updateMatch(req: Request, res: Response) {
//   const body = req?.body as IMatch
//   const matchId = req?.params?.matchId

//   console.log({ matchId })

//   try {
//     const result = await Match.findOneAndUpdate({ _id: matchId }, body, {
//       returnDocument: 'after'
//     })

//     if (result) {
//       return res.status(200).send(result)
//     } else {
//       return res.status(ErrorMapper.NOT_FOUND.status).send(ErrorMapper.NOT_FOUND.user)
//     }
//   } catch (error) {
//     console.error(error)

//     return res
//       .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
//       .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user)
//   }
// }

async function createMatch(req: Request, res: Response) {
  const body = req?.body;

  // const validTournament = await Tournament.findOne({ _id: body?.tournamentId })

  // if (!validTournament) {
  //   return res
  //     .status(400)
  //     .send('You must provide a valid tournament id to create a match')
  // }

  try {
    return res.json([]);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

const MatchController = {
  // getMatch,
  createMatch,
  getMatchesByTournament,
  // updateMatch,
  // getAllTeamMatches,
  // getAllMatches
};

export default MatchController;
