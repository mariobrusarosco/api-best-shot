import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type { Browser, BrowserContext, Page, ViewportSize } from 'playwright';

export type BrowserSessionOptions = {
  viewport?: ViewportSize;
  userAgent?: string;
  defaultTimeoutMs?: number;
  defaultNavigationTimeoutMs?: number;
  ignoreHTTPSErrors?: boolean;
  javaScriptEnabled?: boolean;
};

const DEFAULT_VIEWPORT: ViewportSize = { width: 1280, height: 720 };
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_NAVIGATION_TIMEOUT_MS = 30_000;

export class BrowserSession {
  private context: BrowserContext | null;
  private page: Page | null;
  private readonly markers: Set<string>;

  private constructor(props: { context: BrowserContext; page: Page }) {
    this.context = props.context;
    this.page = props.page;
    this.markers = new Set();
  }

  public static async create(
    props: {
      browser: Browser;
    } & BrowserSessionOptions
  ): Promise<BrowserSession> {
    const context = await props.browser.newContext({
      viewport: props.viewport ?? DEFAULT_VIEWPORT,
      userAgent: props.userAgent ?? DEFAULT_USER_AGENT,
      ignoreHTTPSErrors: props.ignoreHTTPSErrors ?? true,
      javaScriptEnabled: props.javaScriptEnabled ?? true,
    });

    const page = await context.newPage();

    page.setDefaultTimeout(props.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(props.defaultNavigationTimeoutMs ?? DEFAULT_NAVIGATION_TIMEOUT_MS);

    return new BrowserSession({ context, page });
  }

  public getContext(): BrowserContext {
    if (!this.context) throw new Error('Browser session context is not available');

    return this.context;
  }

  public getPage(): Page {
    if (!this.page) throw new Error('Browser session page is not available');

    return this.page;
  }

  public hasMarker(marker: string): boolean {
    return this.markers.has(marker);
  }

  public mark(marker: string): void {
    this.markers.add(marker);
  }

  public async close(): Promise<void> {
    const page = this.page;
    const context = this.context;

    this.page = null;
    this.context = null;

    if (!page && !context) return;

    try {
      await page?.close().catch(() => undefined);
      await context?.close().catch(() => undefined);
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'transport',
        operation: 'closeBrowserSession',
      });
    }
  }
}
