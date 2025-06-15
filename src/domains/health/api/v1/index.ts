import type { Request, Response } from 'express';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import Profiling from '@/services/profiling';

/**
 * Basic health check endpoint
 */
const check = async (_req: Request, res: Response) => {
  try {
    // Basic health check - service is running
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      checks: [
        {
          name: 'api',
          status: 'UP',
        },
      ],
    };

    return res.status(200).json(health);
  } catch (error) {
    return res.status(500).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
};

/**
 * Extended health check that verifies Playwright functionality
 */
const checkPlaywright = async (_req: Request, res: Response) => {
  try {
    // Test if we can create a Playwright instance
    const scraper = await BaseScraper.createInstance();
    const canCreateScraper = !!scraper;

    // Close the scraper to free resources
    await scraper.close();

    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      checks: [
        {
          name: 'api',
          status: 'UP',
        },
        {
          name: 'playwright',
          status: canCreateScraper ? 'UP' : 'DOWN',
          details: canCreateScraper
            ? 'Playwright browser creation successful'
            : 'Failed to create Playwright browser',
        },
      ],
    };

    Profiling.log({
      msg: 'Playwright health check',
      data: { health },
      source: 'HEALTH_CHECK_PLAYWRIGHT',
    });

    return res.status(200).json(health);
  } catch (error) {
    Profiling.error({
      source: 'HEALTH_CHECK_PLAYWRIGHT',
      error,
    });

    return res.status(500).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: 'Playwright health check failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

const API_HEALTH_V1 = {
  check,
  checkPlaywright,
};

export default API_HEALTH_V1;
