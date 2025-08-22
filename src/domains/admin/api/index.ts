import { Request, Response } from 'express';
import db from '@/services/database';
import { T_Member } from '@/domains/member/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { env } from '@/config/env';
import jwt from 'jsonwebtoken';
import { MemberService } from '@/domains/member/services';

export const API_ADMIN = {
  healthCheck: async (req: Request, res: Response) => {
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

  promoteToAdmin: async (req: Request, res: Response) => {
    try {
      const { memberId } = req.body;

      if (!memberId) {
        return res.status(400).json({
          error: 'Member ID is required',
        });
      }

      const updatedMember = await MemberService.updateMemberRole(memberId, 'admin');

      res.status(200).json({
        success: true,
        message: `Member ${updatedMember.nickName} promoted to admin`,
        member: {
          id: updatedMember.id,
          nickName: updatedMember.nickName,
          email: updatedMember.email,
          role: updatedMember.role,
        },
      });
    } catch (error) {
      console.error('Error promoting member to admin:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to promote member to admin',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  demoteFromAdmin: async (req: Request, res: Response) => {
    try {
      const { memberId } = req.body;

      if (!memberId) {
        return res.status(400).json({
          error: 'Member ID is required',
        });
      }

      const updatedMember = await MemberService.updateMemberRole(memberId, 'member');

      res.status(200).json({
        success: true,
        message: `Member ${updatedMember.nickName} demoted to member`,
        member: {
          id: updatedMember.id,
          nickName: updatedMember.nickName,
          email: updatedMember.email,
          role: updatedMember.role,
        },
      });
    } catch (error) {
      console.error('Error demoting member from admin:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to demote member from admin',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};
