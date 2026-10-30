export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  [key: string]: unknown;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export const createPaginationMeta = (
  page = 1,
  pageSize = 10,
  totalRecords = 0
): PaginationMeta => {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / safePageSize);

  return {
    currentPage: safePage,
    pageSize: safePageSize,
    totalRecords,
    totalPages,
    page: safePage,
    limit: safePageSize,
    total: totalRecords,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
};
