import { Request, Response } from 'express';
import { getAIPredictionForMatch } from '../services/prediction-service';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';

/**
 * API layer for handling AI prediction requests
 */
export const API_AI = {
  /**
   * Get AI prediction for a match
   * @route GET /api/v2/ai/predict/match/:matchId
   */
  getMatchPrediction: async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      
      if (!matchId) {
        return res.status(400).json({
          success: false,
          message: 'Match ID is required'
        });
      }
      
      const prediction = await getAIPredictionForMatch(matchId);
      
      return res.status(200).json({
        success: true,
        data: prediction
      });
    } catch (error) {
      console.error('Error getting AI prediction:', error);
      return handleInternalServerErrorResponse(res, error);
    }
  }
}; 