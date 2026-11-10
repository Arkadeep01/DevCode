import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/Button/Button';
import { Eyebrow } from '../../../components/Eyebrow/Eyebrow';
import { ApiError, getCoachResponse, type CoachResponse } from '../../../services/api';
import { toBankQuestions } from '../../../utils/coachQuestion';
import type { Question } from '../../../types/question';
import type { PracticeResult } from '../practiceTypes';
import { formatDuration } from '../formatDuration';
import { ResultsReview } from './ResultsReview';
import { CoachResponsePanel } from './CoachResponsePanel';
import {
  clearCoachSnapshot,
  markResultsReturn,
  readCoachSnapshot,
  writeCoachSnapshot,
} from '../resultsSnapshot';
import './ResultsScreen.css';

interface ResultsScreenProps {
  result: PracticeResult;
  timedOut: boolean;
  /** Stable id of the attempt this screen shows; keys the coaching session. */
  attemptId: string;
  onRetakeSame: () => void;
  onNewQuiz: () => void;
  onRetryMissed: () => void;
  /** Starts a practice session built from the AI-generated questions. */
  onPracticeAiQuestions?: ((questions: Question[]) => void) | undefined;
}

type CoachStatus = 'idle' | 'loading' | 'ready' | 'error';

export function ResultsScreen({
  result,
  timedOut,
  attemptId,
  onRetakeSame,
  onNewQuiz,
  onRetryMissed,
  onPracticeAiQuestions,
}: ResultsScreenProps) {
  const missedCount = result.review.filter((item) => !item.correct).length;

  // Restore the coaching session of this attempt when the user comes back
  // from the Study hub. Nothing is regenerated: the stored answer is reused.
  const restored = readCoachSnapshot(attemptId);

  const [coachStatus, setCoachStatus] = useState<CoachStatus>(restored?.status ?? 'idle');
  const [coachResponse, setCoachResponse] = useState<CoachResponse | null>(
    restored?.response ?? null,
  );
  const [coachError, setCoachError] = useState<string | null>(restored?.error ?? null);
  const [expandedSections, setExpandedSections] = useState<string[]>(
    restored?.expanded ?? [],
  );
  const panelRef = useRef<HTMLDivElement>(null);

  // Mirror the coaching session so it survives the trip to the Study hub.
  useEffect(() => {
    writeCoachSnapshot({
      attemptId,
      status: coachStatus,
      response: coachResponse,
      error: coachError,
      expanded: expandedSections,
    });
  }, [attemptId, coachStatus, coachResponse, coachError, expandedSections]);

  const requestCoach = useCallback(async () => {
    setCoachStatus('loading');
    setCoachError(null);

    try {
      const response = await getCoachResponse({
        attemptId,
        questions: result.review.map((item) => ({
          questionId: item.question.id,
          selectedAnswer: item.selected,
        })),
      });

      setCoachResponse(response);
      setCoachStatus('ready');
      // Move focus to the new panel so keyboard and screen-reader users land
      // on the result instead of staying on the (now disabled) trigger.
      window.requestAnimationFrame(() => panelRef.current?.focus());
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'The coach is unavailable right now.';
      setCoachError(message);
      setCoachStatus('error');
    }
  }, [attemptId, result]);

  const dismissCoach = useCallback(() => {
    setCoachStatus('idle');
    setCoachResponse(null);
    setCoachError(null);
    setExpandedSections([]);
    clearCoachSnapshot();
  }, []);

  const startAiPractice = useCallback(() => {
    if (!coachResponse || !onPracticeAiQuestions) return;
    const questions = toBankQuestions(coachResponse.practiceQuestions);
    if (questions.length === 0) return;
    onPracticeAiQuestions(questions);
  }, [coachResponse, onPracticeAiQuestions]);

  /**
   * Records that the user is leaving for the Study hub, so the Results screen
   * and its coaching session are restored when they come back.
   */
  const openStudyTopic = useCallback(() => {
    markResultsReturn(attemptId);
  }, [attemptId]);

  const toggleExpanded = useCallback((sectionId: string, isOpen: boolean) => {
    setExpandedSections((current) =>
      isOpen
        ? current.includes(sectionId)
          ? current
          : [...current, sectionId]
        : current.filter((id) => id !== sectionId),
    );
  }, []);

  const coachBusy = coachStatus === 'loading';

  return (
    <div className="results">
      <header className="results__hero">
        <Eyebrow dot>Results</Eyebrow>
        <h1 className="results__title" tabIndex={-1}>
          {result.pct >= 80
            ? 'Strong run.'
            : result.pct >= 50
              ? 'Solid base — tighten the gaps.'
              : 'Good start. Review and go again.'}
        </h1>
        <p className="results__sub">
          You scored {result.score} of {result.total} ({result.pct}%).
        </p>
        {timedOut ? (
          <p className="results__notice">
            {result.unanswered > 0
              ? `Time ran out — ${result.unanswered} unanswered question${
                  result.unanswered === 1 ? '' : 's'
                } submitted as skipped.`
              : 'Time ran out — submitted automatically.'}
          </p>
        ) : null}
        <div className="results__actions">
          <Button onClick={onRetryMissed} disabled={missedCount === 0}>
            Retry missed ({missedCount})
          </Button>
          <Button variant="subtle" onClick={onRetakeSame}>
            Retake same set
          </Button>
          <Button variant="ghost" onClick={onNewQuiz}>
            New quiz
          </Button>
          {missedCount > 0 ? (
            <Button
              variant="teal"
              onClick={requestCoach}
              disabled={coachBusy || coachStatus === 'ready'}
            >
              {coachBusy ? 'Coaching…' : 'Coach me on my misses'}
            </Button>
          ) : null}
        </div>
        <p className="results__coach-status" role="status">
          {coachStatus === 'loading' ? 'The coach is reviewing your answers…' : ''}
        </p>
        {coachStatus === 'error' && coachError ? (
          <p className="results__error" role="alert">
            {coachError}
          </p>
        ) : null}
        {coachStatus === 'error' ? (
          <div className="results__coach-retry">
            <Button size="sm" variant="outline" onClick={requestCoach}>
              Try the coach again
            </Button>
          </div>
        ) : null}
      </header>

      {coachStatus === 'ready' && coachResponse ? (
        <div ref={panelRef} tabIndex={-1}>
          <CoachResponsePanel
            response={coachResponse}
            expandedSections={expandedSections}
            onToggleExpanded={toggleExpanded}
            onPracticeQuestions={
              onPracticeAiQuestions ? startAiPractice : undefined
            }
            onOpenStudyTopic={openStudyTopic}
            onDismiss={dismissCoach}
          />
        </div>
      ) : null}

      <section className="results__stats" aria-label="Score summary">
        <div className="results__stat">
          <span className="results__stat-value">{result.pct}%</span>
          <span className="results__stat-label">Score</span>
        </div>
        <div className="results__stat">
          <span className="results__stat-value">
            {result.score}/{result.total}
          </span>
          <span className="results__stat-label">Correct</span>
        </div>
        <div className="results__stat">
          <span className="results__stat-value">{result.unanswered}</span>
          <span className="results__stat-label">Unanswered</span>
        </div>
        <div className="results__stat">
          <span className="results__stat-value">{formatDuration(result.timeSec)}</span>
          <span className="results__stat-label">Time</span>
        </div>
      </section>

      <section className="results__section" aria-labelledby="results-focus">
        <h2 className="results__heading" id="results-focus">
          Focus areas
        </h2>
        {result.focusGroups.length === 0 ? (
          <p className="results__clean">Clean sweep — nothing to review. Raise the difficulty?</p>
        ) : (
          <div className="results__focus">
            {result.focusGroups.map((group) => (
              <div key={group.category} className="results__focus-group">
                <h3 className="results__focus-title">{group.categoryLabel}</h3>
                <ul className="results__focus-list">
                  {group.areas.map((area) => (
                    <li key={area} className="results__focus-item">
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="results__section" aria-labelledby="results-breakdown">
        <h2 className="results__heading" id="results-breakdown">
          Breakdown by track
        </h2>
        <ul className="results__breakdown">
          {result.categories.map((category) => {
            const pct = Math.round((category.correct / category.total) * 100);
            return (
              <li key={category.category} className="results__row">
                <span className="results__row-label">{category.categoryLabel}</span>
                <span className="results__bar" aria-hidden="true">
                  <span className="results__bar-fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="results__row-value">
                  {category.correct}/{category.total} · {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="results__section" aria-labelledby="results-review">
        <h2 className="results__heading" id="results-review">
          Review every question
        </h2>
        <ResultsReview review={result.review} />
      </section>
    </div>
  );
}
