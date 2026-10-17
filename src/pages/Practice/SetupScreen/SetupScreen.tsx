import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/Button/Button';
import { Eyebrow } from '../../../components/Eyebrow/Eyebrow';
import { useToast } from '../../../components/Toast/ToastContext';
import { countForTrack, TRACKS } from '../../../data/questions';
import { clearQuizHistory, readQuizHistory } from '../../../utils/storage';
import type { DifficultyMode, QuestionCategory, QuizAttempt } from '../../../types/question';
import type { PracticeConfig } from '../practiceTypes';
import { formatDuration } from '../formatDuration';
import './SetupScreen.css';

const DIFFICULTIES: DifficultyMode[] = ['Beginner', 'Intermediate', 'Advanced', 'Mixed'];

interface SetupScreenProps {
  onStart: (config: PracticeConfig) => void;
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [tracks, setTracks] = useState<Set<QuestionCategory>>(new Set());
  const [difficulty, setDifficulty] = useState<DifficultyMode>('Mixed');
  const [count, setCount] = useState(5);
  const [untimed, setUntimed] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttempt[]>(() => readQuizHistory().slice(0, 5));
  const toast = useToast();

  const available = useMemo(() => {
    let sum = 0;
    tracks.forEach((track) => {
      sum += countForTrack(track, difficulty);
    });
    return sum;
  }, [tracks, difficulty]);

  const countOptions = useMemo(() => {
    if (available <= 0) return [];
    const standard = [5, 10, 15, 20].filter((value) => value <= available);
    if (!standard.includes(available)) standard.push(available);
    return standard;
  }, [available]);

  useEffect(() => {
    if (available > 0 && count > available) setCount(available);
  }, [available, count]);

  const toggleTrack = (track: QuestionCategory) => {
    setTracks((prev) => {
      const next = new Set(prev);
      if (next.has(track)) {
        next.delete(track);
      } else {
        next.add(track);
      }
      return next;
    });
  };

  const handleClearHistory = () => {
    clearQuizHistory();
    setAttempts([]);
    toast.show('Practice history cleared');
  };

  const canStart = tracks.size > 0 && available > 0;

  return (
    <div className="setup">
      <header className="setup__hero">
        <Eyebrow dot>Assessment engine</Eyebrow>
        <h1 className="setup__title" tabIndex={-1}>Set up your run.</h1>
        <p className="setup__sub">
          Pick your tracks, dial in the difficulty and question count, then
          prove it under the clock.
        </p>
      </header>

      <section className="setup__section" aria-labelledby="setup-tracks">
        <h2 className="setup__heading" id="setup-tracks">
          1. Choose tracks
        </h2>
        <div className="setup__tracks" role="group" aria-label="Question tracks">
          {TRACKS.map((track) => {
            const trackCount = countForTrack(track.key, difficulty);
            const selected = tracks.has(track.key);
            return (
              <button
                key={track.key}
                type="button"
                className={['setup__track', selected ? 'setup__track--on' : ''].join(' ')}
                aria-pressed={selected}
                disabled={trackCount === 0}
                onClick={() => toggleTrack(track.key)}
              >
                <span className="setup__track-label">{track.label}</span>
                <span className="setup__track-count">{trackCount}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="setup__section" aria-labelledby="setup-difficulty">
        <h2 className="setup__heading" id="setup-difficulty">
          2. Difficulty
        </h2>
        <div className="setup__pills" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              type="button"
              className={['setup__pill', difficulty === level ? 'setup__pill--on' : ''].join(' ')}
              aria-pressed={difficulty === level}
              onClick={() => setDifficulty(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </section>

      <section className="setup__section" aria-labelledby="setup-count">
        <h2 className="setup__heading" id="setup-count">
          3. Questions
        </h2>
        {countOptions.length > 0 ? (
          <div className="setup__pills" role="group" aria-label="Question count">
            {countOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={['setup__pill', count === option ? 'setup__pill--on' : ''].join(' ')}
                aria-pressed={count === option}
                onClick={() => setCount(option)}
              >
                {option === available && !([5, 10, 15, 20] as number[]).includes(option)
                  ? `All ${option}`
                  : option}
              </button>
            ))}
          </div>
        ) : (
          <p className="setup__hint">Select at least one track to see available questions.</p>
        )}
        <label className="setup__toggle">
          <input
            type="checkbox"
            checked={untimed}
            onChange={(event) => setUntimed(event.target.checked)}
          />
          Untimed practice (no countdown)
        </label>
      </section>

      <div className="setup__start">
        <Button size="lg" onClick={() => onStart({ tracks: Array.from(tracks), difficulty, count: Math.min(count, available), untimed })} disabled={!canStart}>
          Start quiz &#8599;
        </Button>
        {canStart ? (
          <span className="setup__hint" role="status">
            {available} questions available in this selection
          </span>
        ) : (
          <span className="setup__hint">Choose at least one track to begin.</span>
        )}
      </div>

      <section className="setup__history" aria-labelledby="setup-history">
        <div className="setup__history-head">
          <h2 className="setup__heading" id="setup-history">
            Recent runs
          </h2>
          {attempts.length > 0 ? (
            <button type="button" className="setup__clear" onClick={handleClearHistory}>
              Clear history
            </button>
          ) : null}
        </div>
        {attempts.length > 0 ? (
          <ul className="setup__attempts">
            {attempts.map((attempt) => (
              <li key={attempt.date} className="setup__attempt">
                <span className="setup__attempt-score">
                  {attempt.score}/{attempt.total} · {attempt.pct}%
                </span>
                <span className="setup__attempt-meta">
                  {new Date(attempt.date).toLocaleString()} · {attempt.difficulty} ·{' '}
                  {attempt.tracks.length} track{attempt.tracks.length === 1 ? '' : 's'} ·{' '}
                  {formatDuration(attempt.timeSec)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="setup__hint">No attempts yet — your first run is the baseline.</p>
        )}
      </section>
    </div>
  );
}
