import { PaginationQuery } from '../types/pagination.types';
import { PaginationMeta } from '../types/response.types';

export const buildPaginationMeta = (total: number, query: PaginationQuery): PaginationMeta => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

export const getPaginationOptions = (query: PaginationQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  
  return {
    limit,
    offset: (page - 1) * limit
  };
};
