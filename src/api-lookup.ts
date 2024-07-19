import axios from 'axios'
import fs from 'fs'

type Round = {
  id: number
  content: any
}

const createFile = (id: string, data: any) => {
  fs.writeFile(`./src/external-data/${id}.json`, JSON.stringify(data), err => {
    if (err) {
      console.error(`--- [ERROR] - tournament ${id} ---`, err)
      throw err
    }
    console.warn('--- [ FILE CREATED] ---')
  })
}

export const updateTournament = async ({ url, id }: { url: string; id: string }) => {
  const allRoundsData: Round[] = []
  let ROUND = 1

  console.log('---- FETCHING DATA FOR TOURNAMENT  -----', id)

  while (ROUND <= 38) {
    console.log('----- FETCHING DATA FOR ROUND ----', ROUND)
    const response = await axios.get(`${url}/rodada/${ROUND}/jogos`)
    const data = response.data

    allRoundsData.push({ id: ROUND, content: data })
    ROUND++
  }

  createFile(id, allRoundsData)
}

const run = async () => {
  await updateTournament({
    id: '6fe38eec-4dfe-4568-bed3-6fd504deb57e',
    url: 'https://api.globoesporte.globo.com/tabela/d1a37fa4-e948-43a6-ba53-ab24ab3a45b1/fase/fase-unica-campeonato-brasileiro-2024'
  })

  await updateTournament({
    id: '67807a72-768e-4509-8697-85db2e51df3c',
    url: 'https://api.globoesporte.globo.com/tabela/c33769be-62ec-43c6-a633-8c826e14a696/fase/fase-unica-campeonato-ingles-2024-2025'
  })
}

run()
