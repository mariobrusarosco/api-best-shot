import { Browser, BrowserContext, chromium, Page } from 'playwright';
import { S3FileStorage } from '../file-storage';
import { Profiling } from '@/services/profiling';
import mime from 'mime-types';

export type FetchAndStoreAssetPayload = {
  logoUrl: string;
  filename: string;
};

export class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  private fileStorage: S3FileStorage;
  private readonly cloudFrontDomain: string;

  constructor() {
    this.fileStorage = new S3FileStorage();
    this.cloudFrontDomain = process.env.AWS_CLOUDFRONT_URL || '';
  }

  // https://www.sofascore.com/api/v1/unique-tournament/7/season/61644/statistics/info
  async init() {
    try {
      this.browser = await chromium.launch({
        headless: process.env.NODE_ENV === 'production',
      });
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      });
      this.page = await this.context.newPage();
    } catch (error) {
      console.error('Failed to initialize scraper:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.page?.close();
      await this.context?.close();
      await this.browser?.close();
    } catch (error) {
      console.error('Failed to close scraper:', error);
    }
  }

  public async goto(url: string) {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    return await this.page.goto(url, {
      waitUntil: 'networkidle',
    });
  }

  protected async waitForSelector(selector: string, timeout = 5000) {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    return this.page.waitForSelector(selector, { timeout });
  }

  protected async getText(selector: string) {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    const element = await this.page.$(selector);
    return element ? element.textContent() : null;
  }

  protected async getTexts(selector: string) {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    const elements = await this.page.$$(selector);
    return Promise.all(elements.map(element => element.textContent()));
  }

  protected async getAttribute(selector: string, attribute: string) {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    const element = await this.page.$(selector);
    return element ? element.getAttribute(attribute) : null;
  }

  public sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async getPageContent() {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const jsonText = await this.page.evaluate(() => {
      const pre = document.querySelector('pre');
      return pre ? pre.textContent : document.body.textContent;
    });

    return JSON.parse(jsonText as string);
  }

  public async fetchAsset(payload: FetchAndStoreAssetPayload) {
    const { logoUrl, filename } = payload;

    if (!this.page) throw new Error('Page not initialized');
    if (!logoUrl) throw new Error('logoUrl is required');

    const response = await this.goto(logoUrl);
    if (!response) throw new Error('Failed to fetch image');

    const buffer = await response.body();
    const contentType = response.headers()['content-type'];
    const ext = mime.extension(contentType);

    return {
      buffer,
      contentType,
      filename: `${filename}.${ext || 'png'}`,
    };
  }

  public async uploadAsset(payload: FetchAndStoreAssetPayload): Promise<string> {
    try {
      const { buffer, contentType } = await this.fetchAsset(payload);

      return await this.fileStorage.uploadFile({
        buffer,
        filename: payload.filename,
        contentType,
        directory: 'data-providers',
      });
    } catch (error) {
      console.error('[BaseScraper] Error uploading asset:', error);
      return `dummy-path/${payload.filename}`;
    }
  }

  public getCloudFrontUrl(s3Key: string): string {
    return `https://${this.cloudFrontDomain}/${s3Key}`;
  }
}
