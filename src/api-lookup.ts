import axios from 'axios'
import fs from 'fs'

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

    const allRoundsData: any[] = []
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

const PREMIER_LEAGUE_24_25 = {
  id: '08ebc410-16cb-42ae-a522-0cd1ea5043cf',
  url: 'https://api.globoesporte.globo.com/tabela/c33769be-62ec-43c6-a633-8c826e14a696/fase/fase-unica-campeonato-ingles-2024-2025'
}

const BRASILEIRAO_24 = {
  id: 'e563e004-520d-4fcd-a89b-8435875ab208',
  url: 'https://api.globoesporte.globo.com/tabela/d1a37fa4-e948-43a6-ba53-ab24ab3a45b1/fase/fase-unica-campeonato-brasileiro-2024'
}
