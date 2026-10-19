import { useState } from 'react';
import { Button } from '../../../components/Button/Button';
import { CodeBlock } from '../../../components/CodeBlock/CodeBlock';
import { Tag } from '../../../components/Tag/Tag';
import type { SessionQuestion } from '../../../types/question';
import { formatDuration } from '../formatDuration';
import { QuestionNavigator } from './QuestionNavigator';
import { useQuizShortcuts } from './useQuizShortcuts';
import { useTimerAnnouncements } from './useTimerAnnouncements';
import './QuizScreen.css';

interface QuizScreenProps {
  question: SessionQuestion;
  index: number;
  total: number;
  selected: number | null;
  flagged: boolean;
  answers: (number | null)[];
  flags: boolean[];
  timeLeft: number | null;
  elapsed: number;
  onSelect: (optionIndex: number) => void;
  onToggleFlag: () => void;
  onNavigate: (index: number) => void;
  onSubmit: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export function QuizScreen({
  question,
  index,
  total,
  selected,
  flagged,
  answers,
  flags,
  timeLeft,
  elapsed,
  onSelect,
  onToggleFlag,
  onNavigate,
  onSubmit,
}: QuizScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const unanswered = answers.filter((answer) => answer === null).length;
  const isLowTime = timeLeft !== null && timeLeft <= 30;
  const announcement = useTimerAnnouncements(timeLeft);

  useQuizShortcuts({
    optionCount: question.options.length,
    enabled: !confirming,
    onSelect,
    onNext: () => onNavigate(index + 1),
    onPrev: () => onNavigate(index - 1),
    onToggleFlag,
  });

  const handleSubmit = () => {
    if (unanswered > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    onSubmit();
  };

  return (
    <div className="quiz">
      <header className="quiz__bar">
        <div className="quiz__progress">
          Question {index + 1} of {total}
        </div>
        <div className="quiz__bar-right">
          <span
            className={['quiz__timer', isLowTime ? 'quiz__timer--low' : ''].join(' ')}
            role="timer"
          >
            {timeLeft === null
              ? `Elapsed ${formatDuration(elapsed)}`
              : `Time left ${formatDuration(timeLeft)}`}
            {isLowTime ? <span className="quiz__timer-note">low time</span> : null}
          </span>
          <button
            type="button"
            className={['quiz__flag', flagged ? 'quiz__flag--on' : ''].join(' ')}
            aria-pressed={flagged}
            onClick={onToggleFlag}
          >
            {flagged ? 'Flagged' : 'Flag for review'}
          </button>
          <Button size="sm" onClick={handleSubmit} disabled={confirming}>
            Submit quiz
          </Button>
        </div>
      </header>

      <p className="quiz__announcer" role="status">
        {announcement}
      </p>

      {confirming ? (
        <div className="quiz__confirm" role="alert">
          <span>
            {unanswered} question{unanswered === 1 ? '' : 's'} still unanswered — submit anyway?
          </span>
          <div className="quiz__confirm-actions">
            <Button size="sm" variant="subtle" onClick={() => setConfirming(false)}>
              Keep answering
            </Button>
            <Button size="sm" onClick={onSubmit}>
              Submit anyway
            </Button>
          </div>
        </div>
      ) : null}

      <div className="quiz__grid">
        <article className="quiz__panel">
          <div className="quiz__tags">
            <Tag variant="category">{question.categoryLabel}</Tag>
            <Tag variant="difficulty">{question.difficulty}</Tag>
          </div>
          <h1 className="quiz__question" tabIndex={-1}>{question.question}</h1>
          {question.codeSnippet ? (
            <CodeBlock code={question.codeSnippet} copyable className="quiz__code" />
          ) : null}

          <ul className="quiz__options">
            {question.options.map((option, optionIndex) => {
              const isSelected = selected === optionIndex;
              return (
                <li key={optionIndex}>
                  <button
                    type="button"
                    className={['quiz__option', isSelected ? 'quiz__option--on' : ''].join(' ')}
                    aria-pressed={isSelected}
                    onClick={() => onSelect(optionIndex)}
                  >
                    <span className="quiz__letter" aria-hidden="true">
                      {LETTERS[optionIndex]}
                    </span>
                    <span>{option}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="quiz__nav">
            <Button
              variant="subtle"
              size="sm"
              onClick={() => onNavigate(index - 1)}
              disabled={index === 0}
            >
              &#8592; Previous
            </Button>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => onNavigate(index + 1)}
              disabled={index === total - 1}
            >
              Next &#8594;
            </Button>
          </div>
          <p className="quiz__shortcuts">
            Shortcuts: 1–4 or A–D to answer · arrows to move · F to flag
          </p>
        </article>

        <QuestionNavigator
          answers={answers}
          flags={flags}
          current={index}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
