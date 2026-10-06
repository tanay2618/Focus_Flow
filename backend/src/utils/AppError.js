export class AppError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message Human-readable summary
   * @param {Record<string,string>} [errors] Field-level messages, e.g. { email: 'Enter a valid email' }
   */
  constructor(status, message, errors) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errors = errors;
  }
}
