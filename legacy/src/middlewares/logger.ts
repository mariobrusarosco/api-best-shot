import { NextFunction, Request, Response } from 'express';
import { createColors } from 'picocolors';
import Logger from '../core/logger';

const pc = createColors(process.env.NODE_ENV === 'development');

const colorMethod = (method: string): string => {
  if (method === 'GET') return pc.cyan(method);
  if (method === 'POST') return pc.green(method);
  if (method === 'PUT') return pc.yellow(method);
  if (method === 'PATCH') return pc.magenta(method);
  if (method === 'DELETE') return pc.red(method);
  return pc.white(method);
};

const colorStatus = (statusCode: number): string => {
  if (statusCode >= 500) return pc.red(String(statusCode));
  if (statusCode >= 400) return pc.yellow(String(statusCode));
  if (statusCode >= 300) return pc.cyan(String(statusCode));
  return pc.green(String(statusCode));
};

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const statusCode = res.statusCode;
    const time = new Date().toTimeString().slice(0, 8);
    const line = `${pc.dim(`[${time}]`)} ${pc.cyan('[HTTP]')} ${colorMethod(method)} ${pc.white(url)} ${colorStatus(statusCode)} ${pc.dim(`${durationMs}ms`)}`;

    if (statusCode >= 400) {
      Logger.warn(line);
    } else {
      Logger.info(line);
    }
  });

  next();
};

export default requestLogger;
