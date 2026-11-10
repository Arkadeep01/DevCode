import { useCallback, useEffect, useRef, useState } from 'react';
import { QUESTIONS } from '../../data/questions';
import { sampleWithoutRepeats, shuffle } from '../../utils/shuffle';
import {
  clearSessionKey,
  readSessionJson,
  saveQuizAttempt,
  SESSION_KEYS,
  writeSessionJson,
} from '../../utils/storage';
import { persistQuizAttempt } from '../../services/api';
import type { Question, SessionQuestion } from '../../types/question';
import type { PracticeConfig, PracticePhase, PracticeResult } from './practiceTypes';
import { computeResult } from './computeResult';
import {
  clearResultsSnapshot,
  consumeResultsReturn,
  readResultsSnapshot,
  writeResultsSnapshot,
} from './resultsSnapshot';

const SECONDS_PER_QUESTION = 90;

export interface PracticeDraft {
  config: PracticeConfig;
  questions: SessionQuestion[];
  answers: (number | null)[];
  flags: boolean[];
  current: number;
  startedAt: number;
  deadline: number | null;
}

function readDraft(): PracticeDraft | null {
  const draft = readSessionJson<Partial<PracticeDraft> | null>(SESSION_KEYS.practiceDraft, null);
  if (!draft || typeof draft !== 'object') return null;

  const { config, questions, answers, flags, current, startedAt, deadline } = draft;
  if (!config || !Array.isArray(questions) || questions.length === 0) return null;
  if (!Array.isArray(answers) || answers.length !== questions.length) return null;
  if (!Array.isArray(flags) || flags.length !== questions.length) return null;
  if (typeof current !== 'number' || current < 0 || current >= questions.length) return null;
  if (typeof startedAt !== 'number') return null;
  if (deadline !== null && typeof deadline !== 'number') return null;

  return {
    config,
    questions,
    answers,
    flags,
    current,
    startedAt,
    deadline: deadline ?? null,
  };
}

function clearDraft(): void {
  clearSessionKey(SESSION_KEYS.practiceDraft);
}

export function toSessionQuestion(question: Question | SessionQuestion): SessionQuestion {
  const correctOption = question.options[question.correctIndex];
  const options = shuffle(question.options);
  return {
    ...question,
    options,
    correctIndex: correctOption === undefined ? -1 : options.indexOf(correctOption),
  };
}

export function buildSession(config: PracticeConfig): SessionQuestion[] {
  const pool = QUESTIONS.filter(
    (question) =>
      config.tracks.includes(question.category) &&
      (config.difficulty === 'Mixed' || question.difficulty === config.difficulty),
  );
  return sampleWithoutRepeats(pool, config.count).map(toSessionQuestion);
}

export function usePracticeSession() {
  // Restore the Results screen when the user comes back from the Study hub.
  // The marker is only consumed when it belongs to the stored attempt, so a
  // plain visit to /practice never resurrects an old result.
  const [restored] = useState(() => {
    const snapshot = readResultsSnapshot();
    if (!snapshot) return null;
    if (!consumeResultsReturn(snapshot.attemptId)) return null;
    return snapshot;
  });

  const [phase, setPhase] = useState<PracticePhase>(restored ? 'results' : 'setup');
  const [config, setConfig] = useState<PracticeConfig | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<PracticeResult | null>(restored?.result ?? null);
  const [timedOut, setTimedOut] = useState(restored?.timedOut ?? false);
  const [attemptId, setAttemptId] = useState<string | null>(restored?.attemptId ?? null);
  const [recoverable, setRecoverable] = useState<PracticeDraft | null>(() => readDraft());
  const startedAtRef = useRef(0);
  const deadlineRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (phase !== 'quiz' || !config) return;
    writeSessionJson(SESSION_KEYS.practiceDraft, {
      config,
      questions,
      answers,
      flags,
      current,
      startedAt: startedAtRef.current,
      deadline: deadlineRef.current,
    } satisfies PracticeDraft);
  }, [phase, config, questions, answers, flags, current]);

  useEffect(() => {
    if (phase !== 'quiz') return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'quiz') return;

    const tick = () => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      setTimeLeft((prev) => {
        if (prev === null || deadlineRef.current === null) return prev;
        return Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      });
    };

    const interval = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [phase]);

  const beginSession = useCallback((nextConfig: PracticeConfig, session: SessionQuestion[]) => {
    submittedRef.current = false;
    startedAtRef.current = Date.now();
    deadlineRef.current = nextConfig.untimed
      ? null
      : Date.now() + session.length * SECONDS_PER_QUESTION * 1000;
    setConfig(nextConfig);
    setQuestions(session);
    setAnswers(Array(session.length).fill(null));
    setFlags(Array(session.length).fill(false));
    setCurrent(0);
    setElapsed(0);
    setTimeLeft(nextConfig.untimed ? null : session.length * SECONDS_PER_QUESTION);
    setResult(null);
    setTimedOut(false);
    // A new run invalidates the previous Results screen and its coaching.
    setAttemptId(null);
    clearResultsSnapshot();
    setPhase('quiz');
  }, []);

  const finish = useCallback(
    async (
      sessionQuestions: SessionQuestion[],
      sessionAnswers: (number | null)[],
      sessionFlags: boolean[],
      wasTimedOut = false,
    ) => {
      if (!config || submittedRef.current) return;
      submittedRef.current = true;
      const { result: nextResult, attempt } = computeResult(
        sessionQuestions,
        sessionAnswers,
        sessionFlags,
        startedAtRef.current,
        config,
      );
      const nextAttemptId = `attempt-${startedAtRef.current}`;
      setResult(nextResult);
      setAttemptId(nextAttemptId);
      setTimedOut(wasTimedOut);
      setPhase('results');
      saveQuizAttempt(attempt);
      clearDraft();
      // Mirror the finished attempt so the Results screen can be restored
      // after the user visits the Study hub.
      writeResultsSnapshot({
        attemptId: nextAttemptId,
        result: nextResult,
        timedOut: wasTimedOut,
      });

      // Persist attempt to server (fire and forget)
      try {
        const questionsPayload = sessionQuestions.map((q, index) => ({
          questionId: q.id,
          selectedIndex: sessionAnswers[index] ?? null,
        }));
        await persistQuizAttempt({ attemptId: nextAttemptId, questions: questionsPayload });
      } catch (error) {
        // Log but don't block the UI - localStorage already has the attempt
        console.warn('Failed to persist attempt to server:', error);
      }
    },
    [config],
  );

  useEffect(() => {
    if (phase === 'quiz' && timeLeft === 0 && !submittedRef.current) {
      setTimedOut(true);
      finish(questions, answers, flags, true);
    }
  }, [phase, timeLeft, questions, answers, flags, finish]);

  const start = useCallback(
    (nextConfig: PracticeConfig) => {
      beginSession(nextConfig, buildSession(nextConfig));
    },
    [beginSession],
  );

  /**
   * Starts a session from an explicit question list (used for the AI-generated
   * practice questions). The questions go through the same shuffling and
   * index-remapping as bank questions, so there is only one quiz engine.
   */
  const startWithQuestions = useCallback(
    (questionList: Question[]) => {
      if (questionList.length === 0) return;
      const session = questionList.map(toSessionQuestion);
      const tracks = Array.from(new Set(questionList.map((question) => question.category)));
      const difficulties = new Set(questionList.map((question) => question.difficulty));
      const difficulty =
        difficulties.size === 1 ? (questionList[0]?.difficulty ?? 'Mixed') : 'Mixed';

      beginSession(
        {
          tracks,
          difficulty,
          count: session.length,
          untimed: true,
        },
        session,
      );
    },
    [beginSession],
  );

  const answer = useCallback(
    (optionIndex: number) => {
      setAnswers((prev) => {
        const next = prev.slice();
        next[current] = optionIndex;
        return next;
      });
    },
    [current],
  );

  const goTo = useCallback(
    (index: number) => {
      setCurrent((prev) => {
        const bounded = Math.max(0, Math.min(index, questions.length - 1));
        return bounded === prev ? prev : bounded;
      });
    },
    [questions.length],
  );

  const toggleFlag = useCallback(() => {
    setFlags((prev) => {
      const next = prev.slice();
      next[current] = !next[current];
      return next;
    });
  }, [current]);

  const submitNow = useCallback(() => {
    finish(questions, answers, flags);
  }, [finish, questions, answers, flags]);

  const retakeSame = useCallback(() => {
    if (questions.length === 0 || !config) return;
    beginSession(config, questions.map(toSessionQuestion));
  }, [questions, config, beginSession]);

  const retryMissed = useCallback(() => {
    if (!result || !config) return;
    const missed = result.review.filter((item) => !item.correct).map((item) => item.question);
    if (missed.length === 0) return;
    const session = missed.map(toSessionQuestion);
    beginSession({ ...config, count: session.length }, session);
  }, [result, config, beginSession]);

  const newQuiz = useCallback(() => {
    submittedRef.current = false;
    setResult(null);
    setTimedOut(false);
    setAttemptId(null);
    // Starting over discards the stored Results screen and its coaching.
    clearResultsSnapshot();
    setPhase('setup');
  }, []);

  const resume = useCallback(() => {
    if (!recoverable) return;
    submittedRef.current = false;
    startedAtRef.current = recoverable.startedAt;
    deadlineRef.current = recoverable.deadline;
    setConfig(recoverable.config);
    setQuestions(recoverable.questions);
    setAnswers(recoverable.answers);
    setFlags(recoverable.flags);
    setCurrent(recoverable.current);
    setElapsed(Math.floor((Date.now() - recoverable.startedAt) / 1000));
    setTimeLeft(
      recoverable.deadline === null
        ? null
        : Math.max(0, Math.ceil((recoverable.deadline - Date.now()) / 1000)),
    );
    setResult(null);
    setTimedOut(false);
    setPhase('quiz');
    setRecoverable(null);
  }, [recoverable]);

  const discardRecovery = useCallback(() => {
    clearDraft();
    setRecoverable(null);
  }, []);

  return {
    phase,
    config,
    result,
    timedOut,
    attemptId,
    questions,
    answers,
    flags,
    current,
    timeLeft,
    elapsed,
    recoverable,
    start,
    startWithQuestions,
    resume,
    discardRecovery,
    answer,
    goTo,
    toggleFlag,
    submitNow,
    retakeSame,
    retryMissed,
    newQuiz,
  };
}
