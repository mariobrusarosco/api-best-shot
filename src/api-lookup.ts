import axios from 'axios'
import fs from 'fs'
import { TournamentMode } from './domains/tournament/typing/typing'
import { mapGloboEsportApiRound } from './domains/tournament/typing/data-providers/globo-esporte/api-mapper'

const createFile = (id: string, data: any) => {
  fs.writeFile(`./src/external-data/${id}.json`, JSON.stringify(data), err => {
    if (err) {
      console.error(`--- [ERROR] - tournament ${id} ---`, err)
      throw err
    }
    console.warn('--- [ FILE CREATED] ---')
  })
}

export const createTournamentFile = ({ url, id }: { url: string; id: string }) =>
  new Promise(async resolve => {
    console.log('[FETCHING DATA FOR TOURNAMENT]: ', id)

    const allRoundsData: Round[] = []
    let ROUND = 1

    while (ROUND <= 38) {
      console.log('----- FETCHING DATA FOR ROUND ----', ROUND)
      const response = await axios.get(`${url}/rodada/${ROUND}/jogos`)
      const data = response.data

      allRoundsData.push({ id: ROUND, content: data })
      ROUND++
    }

    createFile(id, allRoundsData)
    console.log('[FETCHING DATA FOR TOURNAMENT]: DONE')
    resolve(allRoundsData)
  })

const updateTournamentOnDatabase = async (id: string) => {
  const response = await axios.patch(
    `http://localhost:9090/api/v1/tournament/${id}/external`
  )

  const data = response.data

  console.log({ data })
}

const createTournamentOnDatabase = (id: string) =>
  new Promise(async resolve => {
    console.log('[PUSHING FILE CONTENT TO DATABASE START]')
    const response = await axios.post(
      `http://localhost:9090/api/v1/tournament/${id}/external`
    )

    console.log('[PUSHING FILE CONTENT TO DATABASE END]')
    resolve('[PUSHING FILE CONTENT TO DATABASE END]')
  })

const PREMIER_LEAGUE_24_25 = {
  id: '08ebc410-16cb-42ae-a522-0cd1ea5043cf',
  url: 'https://api.globoesporte.globo.com/tabela/c33769be-62ec-43c6-a633-8c826e14a696/fase/fase-unica-campeonato-ingles-2024-2025'
}

const BRASILEIRAO_24 = {
  id: 'e563e004-520d-4fcd-a89b-8435875ab208',
  url: 'https://api.globoesporte.globo.com/tabela/d1a37fa4-e948-43a6-ba53-ab24ab3a45b1/fase/fase-unica-campeonato-brasileiro-2024'
}

const createTournament = async <T>(targetUrl: string, mode: TournamentMode) => {
  new Promise(async resolve => {
    console.log(`[FETCHING DATA ON: ${targetUrl}]`)
    console.log(`[TOURNAMENT MODE: ${mode}]`)

    if (mode == 'running-points') {
      const allRoundsData: T[] = []
      let ROUND = 38

      while (ROUND <= 38) {
        console.log(
          `----- FETCHING DATA FOR ROUND ---- ${targetUrl}/rodada/${ROUND}/jogos`
        )
        const responseApiRound = await axios.get(`${targetUrl}/rodada/${ROUND}/jogos`)
        const dataApiRound = responseApiRound.data

        const mappeedRound = mapGloboEsportApiRound({
          matches: dataApiRound,
          roundId: ROUND
        })

        console.log('----- INSERTING ON DATABASE ---')
        // console.log(mappeedRound)

        ROUND++
      }

      // createFile(id, allRoundsData)
      // console.log('[FETCHING DATA FOR TOURNAMENT]: DONE')
      resolve(allRoundsData)
    }
  })
}

const tournamentCreation = async () => {
  // await createTournamentFile(BRASILEIRAO_24)
  // await createTournamentOnDatabase(BRASILEIRAO_24.id)
  await createTournament<GloboEsporteApiRound>(BRASILEIRAO_24.url, 'running-points')

  // await createTournamentFile(PREMIER_LEAGUE_24_25)
  // await createTournamentOnDatabase(PREMIER_LEAGUE_24_25.id)
}

const tournamentUpdate = async () => {
  await createTournamentFile(BRASILEIRAO_24)
  await updateTournamentOnDatabase(BRASILEIRAO_24.id)

  await createTournamentFile(PREMIER_LEAGUE_24_25)
  await updateTournamentOnDatabase(PREMIER_LEAGUE_24_25.id)
}

const run = async () => {
  tournamentCreation()
}

run()
