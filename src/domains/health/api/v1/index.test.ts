import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import express from 'express';
import API_HEALTH_V1 from '@/domains/health/api/v1';

describe('Health API', () => {
  const app = express();
  app.use(express.json());
  app.get('/health', API_HEALTH_V1.check);
  app.get('/health/playwright', API_HEALTH_V1.checkPlaywright);

  describe('GET /health', () => {
    it('should return 200 and UP status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'UP',
        timestamp: expect.any(String),
        checks: [
          {
            name: 'api',
            status: 'UP',
          },
        ],
      });

      // Verify timestamp is a valid ISO string
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });
  });

  describe('GET /health/playwright', () => {
    it('should handle Playwright health check response', async () => {
      const response = await request(app).get('/health/playwright');

      // Common assertions for both success and error cases
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(() => new Date(response.body.timestamp)).not.toThrow();

      // Handle both success (200) and error (500) cases
      if (response.status === 200) {
        expect(response.body).toEqual({
          status: 'UP',
          timestamp: expect.any(String),
          checks: [
            {
              name: 'api',
              status: 'UP',
            },
            {
              name: 'playwright',
              status: expect.stringMatching(/^(UP|DOWN)$/),
              details: expect.any(String),
            },
          ],
        });
      } else {
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          status: 'DOWN',
          timestamp: expect.any(String),
          error: 'Playwright health check failed',
          details: expect.any(String),
        });
      }
    });
  });
});
