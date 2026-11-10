import type { CoachResponse } from '../../services/api';
import {
  clearSessionKey,
  readSessionJson,
  SESSION_KEYS,
  writeSessionJson,
} from '../../utils/storage';
import type { PracticeResult } from './practiceTypes';

/**
 * Persistence for the finished attempt (Layer I).
 *
 * The Results screen and the AI Coach panel hold their state in React, so a
 * route change to the Study hub unmounts them. To be able to come back to the
 * exact same coaching session, both are mirrored into tab-scoped storage —
 * the same mechanism the practice draft already uses.
 *
 * Everything here is validated on read: a malformed or stale snapshot is
 * discarded rather than restored.
 */

/** The finished attempt that the Results screen renders. */
export interface PracticeResultsSnapshot {
  attemptId: string;
  result: PracticeResult;
  timedOut: boolean;
}

/** The coach answer for one attempt, plus the sections the user expanded. */
export interface PracticeCoachSnapshot {
  attemptId: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  response: CoachResponse | null;
  error: string | null;
  /** Ids of the coach sections that were expanded. */
  expanded: string[];
}

/** Marker written when the user leaves the Results screen for the Study hub. */
export interface PracticeReturnMarker {
  attemptId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPracticeResult(value: unknown): value is PracticeResult {
  if (!isRecord(value)) return false;
  return (
    typeof value.score === 'number' &&
    typeof value.total === 'number' &&
    typeof value.pct === 'number' &&
    typeof value.timeSec === 'number' &&
    typeof value.unanswered === 'number' &&
    Array.isArray(value.review) &&
    Array.isArray(value.focusGroups) &&
    Array.isArray(value.categories)
  );
}

export function readResultsSnapshot(): PracticeResultsSnapshot | null {
  const raw = readSessionJson<unknown>(SESSION_KEYS.practiceResults, null);
  if (!isRecord(raw)) return null;
  if (typeof raw.attemptId !== 'string' || raw.attemptId.length === 0) return null;
  if (!isPracticeResult(raw.result)) return null;
  if (typeof raw.timedOut !== 'boolean') return null;

  return {
    attemptId: raw.attemptId,
    result: raw.result,
    timedOut: raw.timedOut,
  };
}

export function writeResultsSnapshot(snapshot: PracticeResultsSnapshot): void {
  writeSessionJson(SESSION_KEYS.practiceResults, snapshot);
}

export function clearResultsSnapshot(): void {
  clearSessionKey(SESSION_KEYS.practiceResults);
  clearSessionKey(SESSION_KEYS.practiceCoach);
  clearSessionKey(SESSION_KEYS.practiceReturn);
}

export function readCoachSnapshot(attemptId: string): PracticeCoachSnapshot | null {
  const raw = readSessionJson<unknown>(SESSION_KEYS.practiceCoach, null);
  if (!isRecord(raw)) return null;
  if (raw.attemptId !== attemptId) return null;
  if (raw.status !== 'idle' && raw.status !== 'loading' && raw.status !== 'ready' && raw.status !== 'error') {
    return null;
  }

  const response = raw.response;
  if (response !== null && !isRecord(response)) return null;

  const expanded = Array.isArray(raw.expanded)
    ? raw.expanded.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    attemptId,
    status: raw.status,
    response: (response ?? null) as CoachResponse | null,
    error: typeof raw.error === 'string' ? raw.error : null,
    expanded,
  };
}

export function writeCoachSnapshot(snapshot: PracticeCoachSnapshot): void {
  writeSessionJson(SESSION_KEYS.practiceCoach, snapshot);
}

export function clearCoachSnapshot(): void {
  clearSessionKey(SESSION_KEYS.practiceCoach);
}

/**
 * Marks that the user is leaving attempt `attemptId` for the Study hub, so
 * the Results screen knows it has to be restored on the way back.
 */
export function markResultsReturn(attemptId: string): void {
  const marker: PracticeReturnMarker = { attemptId };
  writeSessionJson(SESSION_KEYS.practiceReturn, marker);
}

/**
 * Reads and clears the return marker. Returns true only when it belongs to
 * the attempt that is being restored, so a stale marker can never resurrect
 * an unrelated Results screen.
 */
export function consumeResultsReturn(attemptId: string): boolean {
  const raw = readSessionJson<PracticeReturnMarker | null>(SESSION_KEYS.practiceReturn, null);
  if (!raw || raw.attemptId !== attemptId) return false;
  clearSessionKey(SESSION_KEYS.practiceReturn);
  return true;
}
