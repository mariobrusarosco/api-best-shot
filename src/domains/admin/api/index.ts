import { env } from '@/config/env';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { DataProviderReport } from '@/domains/data-provider/services/reporter';
import { StandingsDataProviderService } from '@/domains/data-provider/services/standings';
import { T_Member } from '@/domains/member/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import db from '@/services/database';
import { slackNotifications } from '@/services/notifications/slack';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export const API_ADMIN = {
  healthCheck: async (_req: Request, res: Response) => {
    try {
      res.status(200).json({
        success: true,
        message: 'Admin API is healthy',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error checking health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check health',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  seedDatabase: async (req: Request, res: Response) => {
    try {
      // Security check - only allow in demo environment
      if (env.NODE_ENV !== 'demo' && env.NODE_ENV !== 'development') {
        return res.status(403).json({
          error: 'Seeding is only allowed in demo, development ',
          environment: env.NODE_ENV,
        });
      }

      // Token validation
      const authHeader = req.headers.authorization || '';
      const tokenString = authHeader.replace('Bearer ', '');

      try {
        console.log('Attempting to verify token...');
        const token = jwt.verify(tokenString, env.JWT_SECRET);
        console.log('Token verified successfully');

        if (!token) {
          return res.status(403).json({
            error: 'Invalid token - token payload is empty',
            message: 'The provided token is not valid for seeding operations',
          });
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(403).json({
          error: 'Invalid token',
          message: error instanceof Error ? error.message : 'Unknown error during token verification',
        });
      }

      console.log('🌱 Starting database seeding...');

      // Prepare the members
      const now = new Date();
      const hashedPassword = await bcrypt.hash('test123', 10);
      const members = [
        {
          id: uuidv4(),
          publicId: 'google-oauth2|102617786899713612616',
          email: 'mariobrusarosco@gmail.com',
          firstName: 'Mario',
          lastName: 'Brusarosco de Almeida',
          nickName: 'mariobrusarosco',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          publicId: uuidv4(),
          email: 'test@example.com',
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          nickName: 'TestUser',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          publicId: uuidv4(),
          email: 'john.doe@example.com',
          password: hashedPassword,
          firstName: 'John',
          lastName: 'Doe',
          nickName: 'JohnD',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          publicId: uuidv4(),
          email: 'jane.smith@example.com',
          password: hashedPassword,
          firstName: 'Jane',
          lastName: 'Smith',
          nickName: 'JaneS',
          createdAt: now,
          updatedAt: now,
        },
      ];

      // 3. Insert the members
      await db.insert(T_Member).values(members);
      console.log('🌱 Seeded 4 members.');

      res.status(200).json({
        success: true,
        message: 'Database seeded successfully',
        membersCreated: members.length,
        environment: env.NODE_ENV,
      });
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async createStandings(req: Request, res: Response) {
    let tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>> | null = null;
    // #1 Start Scrapper
    const scraper = await BaseScraper.createInstance();
    // #2 Start a reporter
    const reporter = new DataProviderReport('create_standings');

    try {
      if (!req.body.tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);

      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      reporter.setTournament(tournament);
      // #3 Call Standings Data Provider Service
      const provider = new StandingsDataProviderService(scraper, reporter);
      // #4 Init the provider
      const standings = await provider.init(tournament);
      // #5 Upload report to S3 and save to database (success/failure)  
      await reporter.uploadAndSave();
      // #5.5 Create message with report URL
      provider.createAndSetSlackMessage(tournament, standings);
      // #6 Send Slack notification
      await reporter.sendSlackNotification();
      // #7 Close Playwright browser
      scraper.close();

      console.log({ standings, reporter: reporter.toJSON() });

      return res.status(200).json({
        success: true,
        message: 'Standings created successfully',
      });
    } catch (error) {
      console.error('Error in createStandings:', error);
      reporter.onOperationFailure();
      scraper.close();

      // Send error notification to Slack
      await slackNotifications.sendError(error as Error, {
        operation: 'create_standings',
        tournament: tournament?.label,
        requestId: reporter.requestId,
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to create standings',
        error: (error as Error).message,
      });
    }
  },
};
