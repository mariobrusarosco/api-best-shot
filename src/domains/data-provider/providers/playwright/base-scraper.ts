import type { Browser, BrowserContext, Page, Response } from 'playwright';
import { S3FileStorage } from '../file-storage';
import mime from 'mime-types';
import Profiling from '@/services/profiling';
import { playwrightPool, type BrowserInstance } from '@/utils/playwright-pool';

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
  private poolInstance: BrowserInstance | null = null; // Store pool instance reference

  constructor() {
    this.fileStorage = new S3FileStorage();
    this.cloudFrontDomain = process.env.AWS_CLOUDFRONT_URL || '';
  }

  /**
   * Initialize using browser pool instead of creating new browser
   * @returns this instance after initialization
   */
  private async init() {
    try {
      const startTime = Date.now();

      // Get browser instance from pool
      this.poolInstance = await playwrightPool.getInstance();
      this.browser = this.poolInstance.browser;
      this.context = this.poolInstance.context;

      // Create a new page in the existing context
      if (!this.context) {
        throw new Error('Browser context not available from pool');
      }
      this.page = await this.context.newPage();

      // Set default timeouts
      this.page.setDefaultTimeout(15000); // 15 seconds
      this.page.setDefaultNavigationTimeout(30000); // 30 seconds

      const duration = Date.now() - startTime;
      Profiling.log({
        msg: 'BaseScraper initialized using pool',
        data: {
          duration,
          poolStats: playwrightPool.getStats(),
        },
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
   * Properly close page and release browser instance back to pool
   */
  async close() {
    try {
      // Close only the page, not the entire browser/context
      await this.page?.close().catch(() => {});

      // Release browser instance back to pool
      if (this.poolInstance) {
        playwrightPool.releaseInstance(this.poolInstance);
        Profiling.log({
          msg: 'Browser instance released to pool',
          data: { poolStats: playwrightPool.getStats() },
          source: 'BaseScraper.close',
        });
      }

      // Reset references
      this.page = null;
      this.context = null;
      this.browser = null;
      this.poolInstance = null;
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
