import { useCallback, useEffect, useRef, useState } from 'react';
import { QUESTIONS } from '../../data/questions';
import { sampleWithoutRepeats, shuffle } from '../../utils/shuffle';
import { saveQuizAttempt } from '../../utils/storage';
import type { Question, SessionQuestion } from '../../types/question';
import type { PracticeConfig, PracticePhase, PracticeResult } from './practiceTypes';
import { computeResult } from './computeResult';

const SECONDS_PER_QUESTION = 90;

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
  const startedAtRef = useRef(0);
  const deadlineRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

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
    },
    [config],
  );

  useEffect(() => {
    if (phase === 'quiz' && timeLeft === 0 && !submittedRef.current) {
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
    setPhase('setup');
  }, []);

  return {
    phase,
    config,
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
  };
}
