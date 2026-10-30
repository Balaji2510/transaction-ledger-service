import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../common/errors/index.js';

export interface RequestValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (schemas: RequestValidationSchemas) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        const parsedQuery = (await schemas.query.parseAsync(req.query)) as typeof req.query;
        Object.defineProperty(req, 'query', {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schemas.params) {
        const parsedParams = (await schemas.params.parseAsync(req.params)) as typeof req.params;
        Object.defineProperty(req, 'params', {
          value: parsedParams,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issue = error.issues[0];
        const message = issue ? issue.message : 'Validation failed';
        next(new BadRequestError(message, error.issues));
        return;
      }
      next(error);
    }
  };
};
