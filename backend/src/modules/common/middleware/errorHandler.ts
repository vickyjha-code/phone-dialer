import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function createError(message: string, statusCode: number): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (statusCode === 500) {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  const error = createError('Route not found', 404);
  next(error);
}
