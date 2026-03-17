export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}
