import { DashboardController } from '@/domains/dashboard/controller';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { type Request, Response } from 'express';
import { DashboardService } from '../services';

const getDashboardDeprecated = async (req: Request, res: Response) => {
  try {
    const dashboard = await DashboardController.getDashboard();

    res.status(200).send(dashboard);
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getDashboard = async (_: Request, res: Response) => {
  const dashboard = await DashboardService.getDashboard();

  res.status(200).send(dashboard);
};

export const API_DASHBOARD = {
  getDashboard,
  getDashboardDeprecated,
};
