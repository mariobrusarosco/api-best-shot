import axios from 'axios';
import fs from 'fs';

const createFile = (id: string, data: Array<{ id: number; content: unknown }>) => {
  fs.writeFile(`./src/external-data/${id}.json`, JSON.stringify(data), err => {
    if (err) {
      console.error(`--- [ERROR] - tournament ${id} ---`, err);
      throw err;
    }
    console.warn('--- [ FILE CREATED] ---');
  });
};

export const createTournamentFile = ({ url, id }: { url: string; id: string }) =>
  new Promise<Array<{ id: number; content: unknown }>>(resolve => {
    (async () => {
      console.log('[FETCHING DATA FOR TOURNAMENT]: ', id);

      const allRoundsData: Array<{ id: number; content: unknown }> = [];
      let ROUND = 1;

      while (ROUND <= 38) {
        console.log('----- FETCHING DATA FOR ROUND ----', ROUND);
        const response = await axios.get(`${url}/rodada/${ROUND}/jogos`);
        const data = response.data;

        allRoundsData.push({ id: ROUND, content: data });
        ROUND++;
      }

      createFile(id, allRoundsData);
      console.log('[FETCHING DATA FOR TOURNAMENT]: DONE');
      resolve(allRoundsData);
    })();
  });
