import { Button } from '../../../components/Button/Button';
import { Eyebrow } from '../../../components/Eyebrow/Eyebrow';
import type { PracticeResult } from '../practiceTypes';
import { formatDuration } from '../formatDuration';
import { ResultsReview } from './ResultsReview';
import './ResultsScreen.css';

interface ResultsScreenProps {
  result: PracticeResult;
  onRetakeSame: () => void;
  onNewQuiz: () => void;
  onRetryMissed: () => void;
}

export function ResultsScreen({
  result,
  onRetakeSame,
  onNewQuiz,
  onRetryMissed,
}: ResultsScreenProps) {
  const missedCount = result.review.filter((item) => !item.correct).length;

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
        </div>
      </header>

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
