import { DashboardController } from '@/domains/dashboard/controller';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { type Request, Response } from 'express';

const getDashboard = async (req: Request, res: Response) => {
  try {
    const dashboard = await DashboardController.getDashboard();

    res.status(200).send(dashboard);
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

export const API_Dashboard = {
  getDashboard,
};
