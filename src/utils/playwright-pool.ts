import type { Browser, BrowserContext } from 'playwright';
import { chromium } from 'playwright';
import Profiling from '@/services/profiling';

export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  lastUsed: number;
  inUse: boolean;
}

export class PlaywrightPool {
  private instances: BrowserInstance[] = [];
  private readonly maxPoolSize: number;
  private readonly maxIdleTime: number; // 5 minutes
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(maxPoolSize = 3, maxIdleTimeMinutes = 5) {
    this.maxPoolSize = maxPoolSize;
    this.maxIdleTime = maxIdleTimeMinutes * 60 * 1000;

    // Clean up idle instances every 2 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupIdleInstances();
      },
      2 * 60 * 1000
    );

    Profiling.log({
      msg: 'PlaywrightPool initialized',
      data: { maxPoolSize, maxIdleTimeMinutes },
      source: 'PlaywrightPool.constructor',
    });
  }

  /**
   * Get an available browser instance from the pool
   */
  async getInstance(): Promise<BrowserInstance> {
    const startTime = Date.now();

    // Try to find an available instance
    const availableInstance = this.instances.find(instance => !instance.inUse);

    if (availableInstance) {
      availableInstance.inUse = true;
      availableInstance.lastUsed = Date.now();

      Profiling.log({
        msg: 'Reused browser instance from pool',
        data: {
          poolSize: this.instances.length,
          duration: Date.now() - startTime,
        },
        source: 'PlaywrightPool.getInstance',
      });

      return availableInstance;
    }

    // Create new instance if pool not full
    if (this.instances.length < this.maxPoolSize) {
      const instance = await this.createInstance();
      this.instances.push(instance);

      Profiling.log({
        msg: 'Created new browser instance',
        data: {
          poolSize: this.instances.length,
          duration: Date.now() - startTime,
        },
        source: 'PlaywrightPool.getInstance',
      });

      return instance;
    }

    // Wait for an instance to become available
    return this.waitForAvailableInstance();
  }

  /**
   * Release a browser instance back to the pool
   */
  releaseInstance(instance: BrowserInstance): void {
    instance.inUse = false;
    instance.lastUsed = Date.now();

    Profiling.log({
      msg: 'Released browser instance to pool',
      data: { poolSize: this.instances.length },
      source: 'PlaywrightPool.releaseInstance',
    });
  }

  /**
   * Create a new browser instance
   */
  private async createInstance(): Promise<BrowserInstance> {
    const startTime = Date.now();

    try {
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
        ],
        timeout: 30000,
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
      });

      const instance: BrowserInstance = {
        browser,
        context,
        lastUsed: Date.now(),
        inUse: true,
      };

      const duration = Date.now() - startTime;
      Profiling.log({
        msg: 'Browser instance created successfully',
        data: { duration },
        source: 'PlaywrightPool.createInstance',
      });

      return instance;
    } catch (error) {
      Profiling.error({
        source: 'PlaywrightPool.createInstance',
        error,
      });
      throw error;
    }
  }

  /**
   * Wait for an available instance (with timeout)
   */
  private async waitForAvailableInstance(): Promise<BrowserInstance> {
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        // Check for timeout
        if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error('Timeout waiting for available browser instance'));
          return;
        }

        // Check for available instance
        const availableInstance = this.instances.find(instance => !instance.inUse);
        if (availableInstance) {
          clearInterval(interval);
          availableInstance.inUse = true;
          availableInstance.lastUsed = Date.now();

          Profiling.log({
            msg: 'Got available browser instance after waiting',
            data: {
              waitTime: Date.now() - startTime,
              poolSize: this.instances.length,
            },
            source: 'PlaywrightPool.waitForAvailableInstance',
          });

          resolve(availableInstance);
        }
      }, 100);
    });
  }

  /**
   * Clean up idle instances
   */
  private async cleanupIdleInstances(): Promise<void> {
    const now = Date.now();
    const instancesToRemove: number[] = [];

    for (let i = 0; i < this.instances.length; i++) {
      const instance = this.instances[i];

      if (!instance.inUse && now - instance.lastUsed > this.maxIdleTime) {
        instancesToRemove.push(i);
      }
    }

    for (const index of instancesToRemove.reverse()) {
      const instance = this.instances[index];

      try {
        await instance.context.close();
        await instance.browser.close();
        this.instances.splice(index, 1);

        Profiling.log({
          msg: 'Cleaned up idle browser instance',
          data: { remainingInstances: this.instances.length },
          source: 'PlaywrightPool.cleanupIdleInstances',
        });
      } catch (error) {
        Profiling.error({
          source: 'PlaywrightPool.cleanupIdleInstances',
          error,
        });
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const inUse = this.instances.filter(i => i.inUse).length;
    const available = this.instances.filter(i => !i.inUse).length;

    return {
      total: this.instances.length,
      inUse,
      available,
      maxPoolSize: this.maxPoolSize,
    };
  }

  /**
   * Shutdown the pool and clean up all resources
   */
  async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);

    const closePromises = this.instances.map(async instance => {
      try {
        await instance.context.close();
        await instance.browser.close();
      } catch (error) {
        Profiling.error({
          source: 'PlaywrightPool.shutdown',
          error,
        });
      }
    });

    await Promise.all(closePromises);
    this.instances = [];

    Profiling.log({
      msg: 'PlaywrightPool shutdown completed',
      source: 'PlaywrightPool.shutdown',
    });
  }
}

// Singleton instance
export const playwrightPool = new PlaywrightPool();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  await playwrightPool.shutdown();
});

process.on('SIGINT', async () => {
  await playwrightPool.shutdown();
});
