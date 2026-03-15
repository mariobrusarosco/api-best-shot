import { DashboardController } from '@/domains/dashboard/controller';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { type Request, Response } from 'express';
import { DashboardService } from '../services';

const getDashboardDeprecated = async (_: Request, res: Response) => {
  try {
    const dashboard = await DashboardController.getDashboard();

    res.status(200).send(dashboard);
  } catch (error: unknown) {
    Logger.error(error as Error, {
      domain: DOMAINS.DASHBOARD,
      component: 'api',
      operation: 'getDashboardDeprecated',
    });
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
