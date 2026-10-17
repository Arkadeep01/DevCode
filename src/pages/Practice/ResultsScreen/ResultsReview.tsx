import type { ReviewItem } from '../practiceTypes';
import './ResultsReview.css';

interface ResultsReviewProps {
  review: ReviewItem[];
}

const LETTERS = ['A', 'B', 'C', 'D'];

export function ResultsReview({ review }: ResultsReviewProps) {
  return (
    <ol className="results__review">
      {review.map((item, index) => (
        <li key={item.question.id}>
          <details className="results__item" open={!item.correct}>
            <summary className="results__item-summary">
              <span
                className={[
                  'results__badge',
                  item.correct ? 'results__badge--ok' : 'results__badge--bad',
                ].join(' ')}
              >
                {item.correct ? 'Correct' : 'Missed'}
              </span>
              <span className="results__item-title">
                Q{index + 1} · {item.question.question}
              </span>
              {item.flagged ? <span className="results__flagged">Flagged</span> : null}
              {item.selected === null ? <span className="results__flagged">Skipped</span> : null}
            </summary>
            <div className="results__item-body">
              <p className="results__item-question">{item.question.question}</p>
              <ul className="results__item-options">
                {item.question.options.map((option, optionIndex) => (
                  <li
                    key={optionIndex}
                    className={[
                      'results__item-option',
                      optionIndex === item.question.correctIndex
                        ? 'results__item-option--correct'
                        : '',
                      optionIndex === item.selected &&
                      optionIndex !== item.question.correctIndex
                        ? 'results__item-option--wrong'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="results__item-letter">{LETTERS[optionIndex]}</span>
                    {option}
                  </li>
                ))}
              </ul>
              <p className="results__item-explanation">
                <strong>Why: </strong>
                {item.question.explanation}
              </p>
              <p className="results__item-focus">{item.question.focusArea}</p>
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}
