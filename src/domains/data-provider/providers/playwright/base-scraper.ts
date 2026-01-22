import Profiling from '@/services/profiling';
import mime from 'mime-types';
import type { Browser, BrowserContext, Page, Response } from 'playwright';
import { chromium } from 'playwright';
import { S3FileStorage } from '../../services/file-storage';

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

  /**
   * Initialize the browser, context, and page
   * @returns this instance after initialization
   */
  private async init() {
    try {
      // Check if we're in demo or production environment
      const isProduction = process.env.NODE_ENV === 'production';
      const isDemo = process.env.NODE_ENV === 'demo' || process.env.ENV_PATH?.includes('demo');
      const startTime = Date.now();

      // Always use headless mode in production, demo and CI environments
      const forceHeadless = isProduction || isDemo;

      // Enhanced browser arguments for production environments
      this.browser = await chromium.launch({
        headless: true, // Always use headless mode to avoid X server issues
        args: forceHeadless
          ? [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--single-process',
              '--disable-gpu',
              '--disable-extensions',
              '--disable-background-networking',
              '--disable-default-apps',
              '--disable-sync',
              '--disable-translate',
              '--hide-scrollbars',
              '--metrics-recording-only',
              '--mute-audio',
            ]
          : [],
        timeout: 30000, // 30 second timeout for browser launch
      });

      // Configure browser context with appropriate settings
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 }, // Reduced for less memory usage
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        ignoreHTTPSErrors: true, // Ignore HTTPS errors in production
        javaScriptEnabled: true,
      });

      this.page = await this.context.newPage();

      // Set default timeouts
      this.page.setDefaultTimeout(15000); // 15 seconds
      this.page.setDefaultNavigationTimeout(30000); // 30 seconds

      const duration = Date.now() - startTime;
      Profiling.log({
        msg: 'Playwright browser initialized',
        data: { duration },
        source: 'BaseScraper.init',
      });

      return this;
    } catch (error) {
      Profiling.error({
        source: 'BaseScraper.init',
        error,
      });
      throw error;
    }
  }

  public static async createInstance() {
    const instance = new BaseScraper();
    return await instance.init();
  }

  /**
   * Properly close all Playwright resources
   */
  async close() {
    try {
      await this.page?.close().catch(() => {});
      await this.context?.close().catch(() => {});
      await this.browser?.close().catch(() => {});

      // Reset references
      this.page = null;
      this.context = null;
      this.browser = null;
    } catch (error) {
      Profiling.error({
        source: 'BaseScraper.close',
        error,
      });
    }
  }

  /**
   * Navigate to a URL with retry capability
   * @param url The URL to navigate to
   * @param retries Number of retries if navigation fails
   * @returns The navigation response
   */
  public async goto(url: string, retries = 2): Promise<Response | null> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= retries) {
      try {
        const response = await this.page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 30000, // 30 second timeout
        });

        if (!response) {
          throw new Error(`Failed to get response for URL: ${url}`);
        }

        if (response.status() >= 400) {
          throw new Error(`Received status ${response.status()} for URL: ${url}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        attempt++;
        if (attempt <= retries) {
          Profiling.log({
            msg: `Navigation retry ${attempt}/${retries} for ${url}`,
            data: { error: lastError.message },
            source: 'BaseScraper.goto',
          });

          // Exponential backoff delay
          await this.sleep(1000 * Math.pow(2, attempt));
        }
      }
    }

    // If we get here, all retries failed
    Profiling.error({
      source: 'BaseScraper.goto',
      error: lastError,
    });
    throw lastError;
  }

  protected async waitForSelector(selector: string, timeout = 5000) {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    return this.page.waitForSelector(selector, { timeout });
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

  /**
   * Fetch match data directly from SofaScore API
   * Uses the match-specific endpoint: /api/v1/event/{matchId}
   * @param matchExternalId The SofaScore match ID (external ID)
   * @returns Match data from the API
   */
  public async getMatchData(matchExternalId: string) {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const apiUrl = `https://www.sofascore.com/api/v1/event/${matchExternalId}`;

    try {
      const data = await this.page.evaluate(async url => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }
        return await response.json();
      }, apiUrl);

      return data;
    } catch (error) {
      Profiling.error({
        source: 'BaseScraper.getMatchData',
        error,
        data: { matchExternalId, apiUrl },
      });
      throw error;
    }
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
