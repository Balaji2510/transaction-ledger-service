export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(message = 'Insufficient account balance for this transaction', details?: unknown) {
    super(message, 400, 'INSUFFICIENT_BALANCE', details);
  }
}

export class DuplicateTransactionError extends AppError {
  constructor(message = 'Duplicate transaction reference ID detected', details?: unknown) {
    super(message, 409, 'DUPLICATE_TRANSACTION', details);
  }
}

export class MethodNotAllowedError extends AppError {
  constructor(message = 'Method not allowed. Transactions are immutable and cannot be modified or deleted.', details?: unknown) {
    super(message, 405, 'METHOD_NOT_ALLOWED', details);
  }
}


