import { countForTrack, TRACKS } from '../../data/questions';
import type { DifficultyMode, QuestionCategory } from '../../types/question';
import type { PracticeConfig } from './practiceTypes';

const DIFFICULTIES: DifficultyMode[] = ['Beginner', 'Intermediate', 'Advanced', 'Mixed'];
const DEFAULT_COUNT = 5;

export function availableCount(
  tracks: QuestionCategory[],
  difficulty: DifficultyMode,
): number {
  return tracks.reduce((sum, track) => sum + countForTrack(track, difficulty), 0);
}

export interface SetupParams {
  config: PracticeConfig;
  autostart: boolean;
}

/** Validates /practice query params; unknown values fall back to defaults. */
export function parseSetupParams(params: URLSearchParams): SetupParams {
  const rawTracks = (params.get('track') ?? '')
    .split(',')
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  const tracks = [...new Set(rawTracks)].filter((candidate): candidate is QuestionCategory =>
    TRACKS.some((track) => track.key === candidate),
  );

  const difficulty =
    DIFFICULTIES.find((mode) => mode === params.get('difficulty')) ?? 'Mixed';

  const rawCount = params.get('count');
  const requested = rawCount !== null && /^\d+$/.test(rawCount) ? Number(rawCount) : 0;
  let count = requested > 0 ? requested : DEFAULT_COUNT;
  const available = availableCount(tracks, difficulty);
  if (available > 0) count = Math.min(count, available);

  return {
    config: { tracks, difficulty, count, untimed: false },
    autostart: params.get('autostart') === '1',
  };
}
