import { STORAGE_KEYS } from '../utils/storage';
import { isCoachPracticeQuestion } from '../utils/coachQuestion';
import type { Difficulty, QuestionCategory } from '../types/question';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterInput extends AuthCredentials {
  displayName: string;
}

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details: ApiErrorDetail[];

  constructor(message: string, status: number, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return { ...value };
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.authToken);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token === null) {
      window.localStorage.removeItem(STORAGE_KEYS.authToken);
    } else {
      window.localStorage.setItem(STORAGE_KEYS.authToken, token);
    }
  } catch {
    /* storage unavailable — the session stays in memory only */
  }
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    const payload: unknown = await response.json();
    return payload;
  } catch {
    return null;
  }
}

function parseDetails(payload: unknown): ApiErrorDetail[] {
  const record = asRecord(payload);
  const details = record?.['details'];
  if (!Array.isArray(details)) return [];
  return details.flatMap((item) => {
    const entry = asRecord(item);
    const path = entry?.['path'];
    const message = entry?.['message'];
    return typeof path === 'string' && typeof message === 'string' ? [{ path, message }] : [];
  });
}

function parseUser(value: unknown): AuthUser {
  const record = asRecord(value);
  const id = record?.['id'];
  const email = record?.['email'];
  const displayName = record?.['displayName'];
  const createdAt = record?.['createdAt'];
  if (
    typeof id !== 'number' ||
    typeof email !== 'string' ||
    typeof displayName !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    throw new ApiError('Unexpected user payload', 500);
  }
  return { id, email, displayName, createdAt };
}

function parseSession(payload: unknown): AuthSession {
  const record = asRecord(payload);
  const token = record?.['token'];
  if (typeof token !== 'string' || token.length === 0) {
    throw new ApiError('Unexpected session payload', 500);
  }
  return { token, user: parseUser(record?.['user']) };
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token !== null) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const payload = await readPayload(response);

  if (!response.ok) {
    const record = asRecord(payload);
    const error = record?.['error'];
    const message =
      typeof error === 'string' ? error : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, parseDetails(payload));
  }

  return payload;
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const payload = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return parseSession(payload);
}

export async function login(credentials: AuthCredentials): Promise<AuthSession> {
  const payload = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  return parseSession(payload);
}

export async function fetchMe(): Promise<AuthUser> {
  const payload = await request('/auth/me');
  const record = asRecord(payload);
  return parseUser(record?.['user']);
}

export interface PersistAttemptRequest {
  attemptId: string;
  questions: Array<{
    questionId: string;
    selectedIndex: number | null;
  }>;
}

export async function persistQuizAttempt(payload: PersistAttemptRequest): Promise<void> {
  await request('/attempts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface CoachRequest {
  attemptId?: string;
  questions: Array<{
    questionId: string;
    selectedAnswer: number | null;
  }>;
}

export interface CoachExplanation {
  questionId: string;
  whyWrong: string;
  concept: string;
  explanation: string;
}

export interface CoachStudyPlanItem {
  topicId: string;
  reason: string;
  priority: number;
}

export interface CoachPracticeQuestion {
  id: string;
  category: QuestionCategory;
  categoryLabel: string;
  difficulty: Difficulty;
  question: string;
  codeSnippet: string | null;
  options: string[];
  correctIndex: number;
  explanation: string;
  focusArea: string;
  aiGenerated: true;
}

export interface CoachResponse {
  explanations: CoachExplanation[];
  studyPlan: CoachStudyPlanItem[];
  practiceQuestions: CoachPracticeQuestion[];
  /** True when the response was served from the server cache. */
  cached?: boolean;
}

function parseCoachExplanation(value: unknown): CoachExplanation | null {
  const record = asRecord(value);
  if (!record) return null;
  const { questionId, whyWrong, concept, explanation } = record;
  if (
    typeof questionId !== 'string' ||
    typeof whyWrong !== 'string' ||
    typeof concept !== 'string' ||
    typeof explanation !== 'string'
  ) {
    return null;
  }
  return { questionId, whyWrong, concept, explanation };
}

function parseStudyPlanItem(value: unknown): CoachStudyPlanItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const { topicId, reason, priority } = record;
  if (
    typeof topicId !== 'string' ||
    typeof reason !== 'string' ||
    typeof priority !== 'number'
  ) {
    return null;
  }
  return { topicId, reason, priority };
}

/**
 * Validates the coach payload before the UI trusts it. Malformed entries are
 * dropped; a payload without the three collections is treated as an error.
 */
export function parseCoachResponse(payload: unknown): CoachResponse {
  const record = asRecord(payload);
  if (!record) {
    throw new ApiError('Unexpected coach payload', 500);
  }

  const explanations = Array.isArray(record['explanations'])
    ? record['explanations']
        .map(parseCoachExplanation)
        .filter((item): item is CoachExplanation => item !== null)
    : [];

  const studyPlan = Array.isArray(record['studyPlan'])
    ? record['studyPlan']
        .map(parseStudyPlanItem)
        .filter((item): item is CoachStudyPlanItem => item !== null)
    : [];

  const practiceQuestions = Array.isArray(record['practiceQuestions'])
    ? record['practiceQuestions'].filter(isCoachPracticeQuestion)
    : [];

  return {
    explanations,
    studyPlan,
    practiceQuestions,
    cached: record['cached'] === true,
  };
}

export async function getCoachResponse(payload: CoachRequest): Promise<CoachResponse> {
  const result = await request('/coach', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return parseCoachResponse(result);
}
