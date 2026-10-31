import { env } from '../config/env.js';
import { MockCoachProvider } from './mockProvider.js';
import { RealCoachProvider } from './realProvider.js';
import type { CoachProvider } from './provider.js';

/** Builds the coach provider from configuration (mock by default, real when keyed). */
export function createCoachProvider(): CoachProvider {
  if (env.COACH_PROVIDER === 'openai') {
    return new RealCoachProvider();
  }
  return new MockCoachProvider();
}