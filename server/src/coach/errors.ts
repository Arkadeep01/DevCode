export type CoachErrorStatusCode = 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503;

export class CoachError extends Error {
  readonly statusCode: CoachErrorStatusCode;

  constructor(message: string, statusCode: CoachErrorStatusCode = 500) {
    super(message);
    this.name = 'CoachError';
    this.statusCode = statusCode;
  }
}

export class CoachProviderError extends CoachError {
  constructor(message: string) {
    super(message, 502);
    this.name = 'CoachProviderError';
  }
}

export class CoachProviderUnavailableError extends CoachError {
  constructor(message: string) {
    super(message, 503);
    this.name = 'CoachProviderUnavailableError';
  }
}