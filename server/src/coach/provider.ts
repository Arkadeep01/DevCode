import type { CoachContext } from './types.js';

/**
 * Provider abstraction for the AI coach (Layer C).
 *
 * The application depends on this interface only; concrete providers (mock,
 * real) are injected, so business logic never knows which model served a response.
 */
export interface CoachProvider {
  readonly name: string;
  generate(ctx: CoachContext): Promise<unknown>;
}