export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    [key: string]: unknown;
  };
}

export class ApiResponseBuilder {
  static success<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  static error(code: string, message: string, details?: unknown): ApiResponse<never> {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}

