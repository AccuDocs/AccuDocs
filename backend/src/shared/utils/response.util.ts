import { ApiResponse, PaginationMeta } from '../types/response.types';

export const successResponse = <T>(data: T, meta?: PaginationMeta): ApiResponse<T> => {
  return {
    success: true,
    data,
    ...(meta && { meta })
  };
};

export const errorResponse = (code: string, message: string, details?: any[]): ApiResponse<any> => {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    }
  };
};
