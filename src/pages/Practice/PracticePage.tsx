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
    start,
    answer,
    goTo,
    toggleFlag,
    submitNow,
    retakeSame,
    retryMissed,
    newQuiz,
  } = usePracticeSession();

  if (phase === 'setup') {
    return <SetupScreen onStart={start} />;
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
