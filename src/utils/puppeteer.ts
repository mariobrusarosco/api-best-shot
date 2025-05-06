import puppeteer from "puppeteer";

export const fetchImageWithPuppeteer = async (url: string): Promise<{ buffer: Buffer; contentType: string }> => {
    // NOTE: Puppeteer requires the following system dependencies on Ubuntu/Debian:
    // sudo apt-get update
    // sudo apt-get install -y chromium-browser libx11-xcb1 libxcomposite1 libasound2 libatk1.0-0 libatk-bridge2.0-0 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      
      // Navigate to URL
      const response = await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      if (!response) {
        throw new Error('No response received');
      }
      
      const statusCode = response.status();
      if (statusCode !== 200) {
        throw new Error(`Failed to fetch image: HTTP status ${statusCode}`);
      }
      
      const contentType = response.headers()['content-type'] || 'image/png';
      const buffer = await response.buffer();
      
      return { buffer, contentType };
    } finally {
      await browser.close();
    }
  }