import { Button } from '../../components/Button/Button';
import { QuizScreen } from './QuizScreen/QuizScreen';
import { ResultsScreen } from './ResultsScreen/ResultsScreen';
import { SetupScreen } from './SetupScreen/SetupScreen';
import { usePracticeSession } from './usePracticeSession';
import './PracticePage.css';

export function PracticePage() {
  const {
    phase,
    result,
    questions,
    answers,
    flags,
    current,
    timeLeft,
    elapsed,
    recoverable,
    start,
    resume,
    discardRecovery,
    answer,
    goTo,
    toggleFlag,
    submitNow,
    retakeSame,
    retryMissed,
    newQuiz,
  } = usePracticeSession();

  if (phase === 'setup') {
    return (
      <>
        {recoverable ? (
          <div className="practice-recovery" role="region" aria-label="Unfinished quiz">
            <div className="practice-recovery__text">
              <strong>Unfinished quiz found.</strong>{' '}
              <span>
                Question {recoverable.current + 1} of {recoverable.questions.length} ·{' '}
                {recoverable.answers.filter((item) => item !== null).length} answered
              </span>
            </div>
            <div className="practice-recovery__actions">
              <Button size="sm" onClick={resume}>
                Resume quiz
              </Button>
              <Button size="sm" variant="subtle" onClick={discardRecovery}>
                Discard
              </Button>
            </div>
          </div>
        ) : null}
        <SetupScreen onStart={start} />
      </>
    );
  }

  if (phase === 'quiz' && questions.length > 0) {
    const question = questions[current];
    return (
      <QuizScreen
        question={question}
        index={current}
        total={questions.length}
        selected={answers[current] ?? null}
        flagged={Boolean(flags[current])}
        answers={answers}
        flags={flags}
        timeLeft={timeLeft}
        elapsed={elapsed}
        onSelect={answer}
        onToggleFlag={toggleFlag}
        onNavigate={goTo}
        onSubmit={submitNow}
      />
    );
  }

  if (phase === 'results' && result) {
    return (
      <ResultsScreen
        result={result}
        onRetakeSame={retakeSame}
        onNewQuiz={newQuiz}
        onRetryMissed={retryMissed}
      />
    );
  }

  return <div className="practice-fallback container" aria-busy="true" />;
}
