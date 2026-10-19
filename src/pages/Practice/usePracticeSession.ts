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
import type { Question, SessionQuestion } from '../../types/question';
import type { PracticeConfig, PracticePhase, PracticeResult } from './practiceTypes';
import { computeResult } from './computeResult';

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
  return { ...question, options, correctIndex: options.indexOf(correctOption) };
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
  const [phase, setPhase] = useState<PracticePhase>('setup');
  const [config, setConfig] = useState<PracticeConfig | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [timedOut, setTimedOut] = useState(false);
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
    setPhase('quiz');
  }, []);

  const finish = useCallback(
    (sessionQuestions: SessionQuestion[], sessionAnswers: (number | null)[], sessionFlags: boolean[]) => {
      if (!config || submittedRef.current) return;
      submittedRef.current = true;
      const { result: nextResult, attempt } = computeResult(
        sessionQuestions,
        sessionAnswers,
        sessionFlags,
        startedAtRef.current,
        config,
      );
      setResult(nextResult);
      setPhase('results');
      saveQuizAttempt(attempt);
      clearDraft();
    },
    [config],
  );

  useEffect(() => {
    if (phase === 'quiz' && timeLeft === 0 && !submittedRef.current) {
      setTimedOut(true);
      finish(questions, answers, flags);
    }
  }, [phase, timeLeft, questions, answers, flags, finish]);

  const start = useCallback(
    (nextConfig: PracticeConfig) => {
      beginSession(nextConfig, buildSession(nextConfig));
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
  };
}
