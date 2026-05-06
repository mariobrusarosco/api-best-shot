import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type { Browser } from 'playwright';
import { chromium } from 'playwright';
import { BrowserSession, type BrowserSessionOptions } from './browser-session';

export type PlaywrightRuntimeOptions = {
  headless?: boolean;
  launchTimeoutMs?: number;
};

const DEFAULT_LAUNCH_TIMEOUT_MS = 30_000;

export class PlaywrightRuntime {
  private browser: Browser | null;

  private constructor(browser: Browser) {
    this.browser = browser;
  }

  public static async create(options: PlaywrightRuntimeOptions = {}): Promise<PlaywrightRuntime> {
    const browser = await chromium.launch({
      headless: options.headless ?? resolveDefaultHeadless(),
      args: buildChromiumArgs(),
      timeout: options.launchTimeoutMs ?? DEFAULT_LAUNCH_TIMEOUT_MS,
    });

    Logger.info('V2 Playwright runtime initialized ----');

    return new PlaywrightRuntime(browser);
  }

  public async createSession(options: BrowserSessionOptions = {}): Promise<BrowserSession> {
    if (!this.browser) throw new Error('Playwright runtime is not available');

    return BrowserSession.create({
      browser: this.browser,
      ...options,
    });
  }

  public async close(): Promise<void> {
    const browser = this.browser;
    this.browser = null;

    if (!browser) return;

    try {
      await browser.close().catch(() => undefined);
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'transport',
        operation: 'closePlaywrightRuntime',
      });
    }
  }
}

const resolveDefaultHeadless = (): boolean => {
  const nodeEnv = (process.env.NODE_ENV || 'development').trim();

  return nodeEnv !== 'development';
};

const buildChromiumArgs = (): string[] => {
  return [
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
  ];
};
