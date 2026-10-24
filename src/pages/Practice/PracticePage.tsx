import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { useNavigationGuard } from '../../components/NavigationGuard/NavigationGuardContext';
import { QuizScreen } from './QuizScreen/QuizScreen';
import { ResultsScreen } from './ResultsScreen/ResultsScreen';
import { SetupScreen } from './SetupScreen/SetupScreen';
import { availableCount, parseSetupParams } from './setupParams';
import { usePracticeSession } from './usePracticeSession';
import './PracticePage.css';

export function PracticePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [setup] = useState(() => parseSetupParams(searchParams));
  const autostartConsumed = useRef(false);
  const { setGuard } = useNavigationGuard();
  const {
    phase,
    result,
    timedOut,
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

  useEffect(() => {
    setGuard(phase === 'quiz');
    return () => setGuard(false);
  }, [phase, setGuard]);

  useEffect(() => {
    if (phase !== 'setup' || autostartConsumed.current) return;
    autostartConsumed.current = true;
    if (!setup.autostart) return;

    if (searchParams.has('autostart')) {
      const next = new URLSearchParams(searchParams);
      next.delete('autostart');
      setSearchParams(next, { replace: true });
    }

    if (recoverable) return;

    const { tracks, difficulty, count, untimed } = setup.config;
    if (tracks.length > 0 && availableCount(tracks, difficulty) > 0) {
      start({ tracks, difficulty, count, untimed });
    }
  }, [phase, recoverable, setup, searchParams, setSearchParams, start]);

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
        <SetupScreen onStart={start} initialConfig={setup.config} />
      </>
    );
  }

  if (phase === 'quiz') {
    const question = questions[current];
    if (question) {
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
  }

  if (phase === 'results' && result) {
    return (
      <ResultsScreen
        result={result}
        timedOut={timedOut}
        onRetakeSame={retakeSame}
        onNewQuiz={newQuiz}
        onRetryMissed={retryMissed}
      />
    );
  }

  return <div className="practice-fallback container" aria-busy="true" />;
}
