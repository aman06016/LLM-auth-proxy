export class AppError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}
