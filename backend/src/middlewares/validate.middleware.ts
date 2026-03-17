import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { errorResponse } from '../shared/utils/response.util';

export const validate = (schema: AnyZodObject, property: 'body' | 'query' | 'params' | 'all' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (property === 'all') {
        await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
      } else {
        req[property] = await schema.parseAsync(req[property]);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(errorResponse('VALIDATION_ERROR', 'Validation failed', error.errors));
        return;
      }
      next(error);
    }
  };
};
