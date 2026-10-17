import './QuestionNavigator.css';

interface QuestionNavigatorProps {
  answers: (number | null)[];
  flags: boolean[];
  current: number;
  onNavigate: (index: number) => void;
}

export function QuestionNavigator({
  answers,
  flags,
  current,
  onNavigate,
}: QuestionNavigatorProps) {
  const unanswered = answers.filter((answer) => answer === null).length;

  return (
    <aside className="quiz__navigator" aria-label="Question navigator">
      <h2 className="quiz__navigator-title">Navigator</h2>
      <div className="quiz__dots">
        {answers.map((answer, dotIndex) => (
          <button
            key={dotIndex}
            type="button"
            className={[
              'quiz__dot',
              answer !== null ? 'quiz__dot--answered' : '',
              flags[dotIndex] ? 'quiz__dot--flagged' : '',
              dotIndex === current ? 'quiz__dot--current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={`Go to question ${dotIndex + 1}${flags[dotIndex] ? ' (flagged)' : ''}${
              answer !== null ? ' (answered)' : ''
            }`}
            onClick={() => onNavigate(dotIndex)}
          >
            {dotIndex + 1}
          </button>
        ))}
      </div>
      <ul className="quiz__legend">
        <li className="quiz__legend-item">
          <span className="quiz__legend-swatch quiz__dot--answered" /> Answered
        </li>
        <li className="quiz__legend-item">
          <span className="quiz__legend-swatch quiz__dot--flagged" /> Flagged
        </li>
        <li className="quiz__legend-item">
          <span className="quiz__legend-swatch quiz__dot--current" /> Current
        </li>
      </ul>
      <p className="quiz__navigator-note">
        {unanswered > 0
          ? `${unanswered} unanswered so far`
          : 'All questions answered — nice.'}
      </p>
    </aside>
  );
}
