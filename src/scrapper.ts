import fs from 'fs';
import puppeteer, { Page } from 'puppeteer';
import * as cheerio from 'cheerio';

type Round = {
  id: number;
  content: any;
};
const allRoundsData: Round[] = [];
const SELECTORS = {
  listOfGames: '.lista-jogos',
  listOfGamesLoading: '.loading',
  navigationBar: '.lista-jogos__navegacao',
  navigationLeftArrow: '.lista-jogos__navegacao--seta-esquerda',
  navigationRightArrow: '.lista-jogos__navegacao--seta-direita',
  roundDisplay: '.lista-jogos__navegacao--rodada',
  roundItem: '.lista-jogos__jogo',
  gameDates: 'meta[itemprop="startDate"]',
  gameLocal: '.jogo__informacoes--local',
  gameHour: '.jogo__informacoes--hora',
  homeTeam: '.placar__equipes--mandante',
  awayTeam: '.placar__equipes--visitante',
};

const createFile = () => {
  fs.writeFile(
    './src/external-data/6fe38eec-4dfe-4568-bed3-6fd504deb57e.json',
    JSON.stringify(allRoundsData),
    err => {
      if (err) {
        console.error('--- [ERROR] ---', err);
        throw err;
      }
      console.warn('--- [ FILE CREATED] ---');
    }
  );
};

const getRound = async ($: cheerio.CheerioAPI) => {
  const roundDisplay = $(SELECTORS.roundDisplay).text();
  const [result] = roundDisplay.match(/(\d+)/gi) ?? [];
  return Number(result);
};

const goToFirstRound = async (page: Page) => {
  const upadatedPage = await page.content();
  const context = cheerio.load(upadatedPage);
  let currentRound = await getRound(context);

  while (currentRound > 1) {
    await page.locator(SELECTORS.navigationLeftArrow).click();
    const upadatedPage = await page.content();
    const context = cheerio.load(upadatedPage);
    currentRound = await getRound(context);
  }
};

const startScrapping = async (page: Page) => {
  const upadatedPage = await page.content();
  const context = cheerio.load(upadatedPage);
  let currentRound = await getRound(context);
  console.log('entering while', currentRound);

  while (currentRound <= 38) {
    const upadatedPage = await page.content();
    const $ = cheerio.load(upadatedPage);
    console.log('GETTING DATA FOR ROUND', currentRound);

    const list = $(SELECTORS.listOfGames);
    const rounds = list.find(SELECTORS.roundItem);
    const round = await getRound($);

    const metadata: any[] = [];
    rounds.each(function () {
      const el = $(this);
      const gameLocal = el.find(SELECTORS.gameLocal).text();
      const gameHour = el.find(SELECTORS.gameHour).text();
      const homeTeam = el.find(`${SELECTORS.homeTeam} .equipes__sigla`).text();
      const awayTeam = el.find(`${SELECTORS.awayTeam} .equipes__sigla`).text();

      metadata.push({ gameHour, gameLocal, homeTeam, awayTeam });
    });
    allRoundsData.push({ id: round, content: [...metadata] });
    console.log('DONE SCRAPPING DATA FOR ROUND', currentRound);
    await page.locator(SELECTORS.navigationRightArrow).click();
    await page.waitForSelector('.lista-jogos__jogo');
    currentRound++;
  }
};
