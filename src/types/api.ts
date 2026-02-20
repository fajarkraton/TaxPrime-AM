/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
    };
}

/** Pagination metadata */
export interface PaginationMeta {
    totalCount: number;
    pageSize: number;
    hasMore: boolean;
    lastDocId?: string;
}

/** Paginated response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: PaginationMeta;
}

/** Sort configuration */
export interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}
