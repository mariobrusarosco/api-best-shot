import { Request, Response } from 'express';
import db from '@/services/database';
import { T_Member } from '@/domains/member/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { env } from '@/config/env';

export const API_ADMIN = {
  healthCheck: async (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Admin API is healthy',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
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
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (token !== env.SEED_DB_TOKEN) {
        return res.status(403).json({
          error: 'Invalid token',
          message: 'The provided token is not valid for seeding operations',
        });
      }

      console.log('🌱 Starting database seeding...');

      // 1. Truncate the member table
      await db.delete(T_Member);
      console.log('🧹 Member table truncated.');

      // 2. Prepare the four members
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
};
