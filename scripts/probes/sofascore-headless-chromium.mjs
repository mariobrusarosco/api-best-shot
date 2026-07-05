import { chromium } from 'playwright';

const pageUrl = 'https://www.sofascore.com/football/tournament/brazil/brasileirao-serie-b/390';
const apiUrl = 'https://www.sofascore.com/api/v1/unique-tournament/390/season/89840/events/round/17';

const browser = await chromium.launch({
  headless: true,
});

const page = await browser.newPage();

console.log('Opening SofaScore tournament page in headless Chromium...');
await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

console.log('Waiting for browser/session state...');
await page.waitForTimeout(5000);

console.log('Fetching SofaScore API from inside the browser page...');
const result = await page.evaluate(async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json,*/*',
    },
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}, apiUrl);

console.log(JSON.stringify(result, null, 2));

await browser.close();
