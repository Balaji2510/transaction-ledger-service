import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/index.js';
import { ApiResponseBuilder } from '../common/http/api-response.js';
import { config } from '../config/env.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      ApiResponseBuilder.error(err.code, err.message, err.details)
    );
    return;
  }

  // Handle unexpected syntax errors (e.g. malformed JSON in request body)
  if ('type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    res.status(400).json(
      ApiResponseBuilder.error('INVALID_JSON', 'Malformed JSON payload provided')
    );
    return;
  }

  console.error('Unhandled server error:', err);

  const message = config.nodeEnv === 'production' 
    ? 'Internal server error occurred' 
    : err.message || 'Internal server error occurred';

  res.status(500).json(
    ApiResponseBuilder.error('INTERNAL_SERVER_ERROR', message)
  );
};

