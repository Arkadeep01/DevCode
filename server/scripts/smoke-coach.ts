/**
 * End-to-end smoke check for the AI Quiz Coach pipeline.
 *
 * Boots the real Express app on a throwaway database, registers a user,
 * persists a finished attempt, and asks the coach to explain the misses.
 *
 * Run with: npx tsx server/scripts/smoke-coach.ts
 */
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.DATABASE_URL = join(tmpdir(), `devcode-smoke-${randomUUID()}.sqlite`);
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'smoke-only-secret-0123456789abcdef';
process.env.NODE_ENV = 'test';

const { createApp } = await import('../src/app.js');
const { db, sqlite } = await import('../src/db/client.js');
const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
const { fileURLToPath } = await import('node:url');
const { questions } = await import('../src/db/schema.js');

migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });

const app = createApp();
const base = 'http://127.0.0.1';

async function call(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const response = await fetch(`${base}:${port}${path}`, { ...init, headers });
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body };
  } finally {
    server.close();
  }
}

function check(label: string, condition: boolean, detail?: unknown): void {
  const status = condition ? 'PASS' : 'FAIL';
  process.stdout.write(`[${status}] ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}\n`);
  if (!condition) process.exitCode = 1;
}

const email = `smoke-${randomUUID().slice(0, 8)}@example.com`;
const registration = await call('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ email, password: 'password123', displayName: 'Smoke Tester' }),
});
check('user registers', registration.status === 201, registration.status);
const token = (registration.body as { token: string }).token;

db.insert(questions)
  .values({
    slug: 'smoke-dsa-1',
    category: 'dsa',
    difficulty: 'Intermediate',
    prompt: 'Which traversal visits nodes in ascending order on a BST?',
    options: ['In-Order', 'Pre-Order', 'Post-Order', 'Level-Order'],
    correctIndex: 0,
    explanation: 'In-Order traversal visits nodes in ascending order.',
    focusArea: 'Focus Area: Binary Search Tree In-Order Traversal',
  })
  .run();

const attempt = await call(
  '/api/attempts',
  {
    method: 'POST',
    body: JSON.stringify({
      attemptId: 'smoke-attempt-1',
      questions: [{ questionId: 'smoke-dsa-1', selectedIndex: 1 }],
    }),
  },
  token,
);
check('attempt is persisted', attempt.status === 201, attempt.body);

const row = sqlite
  .prepare('SELECT is_correct, correct_answer, focus_area FROM attempts LIMIT 1')
  .get() as { is_correct: number; correct_answer: number; focus_area: string };
check('correctness is resolved server-side', row.is_correct === 0, row);
check('canonical focus area is stored', row.focus_area.startsWith('Focus Area:'), row.focus_area);

const coach = await call(
  '/api/coach',
  {
    method: 'POST',
    body: JSON.stringify({
      attemptId: 'smoke-attempt-1',
      questions: [{ questionId: 'smoke-dsa-1', selectedAnswer: 1 }],
    }),
  },
  token,
);
check('coach answers', coach.status === 200, coach.status);

const coachBody = coach.body as {
  explanations: Array<{ questionId: string; explanation: string }>;
  studyPlan: Array<{ topicId: string }>;
  practiceQuestions: Array<{ aiGenerated: boolean }>;
  cached: boolean;
};
check('the miss is explained', coachBody.explanations.length === 1, coachBody.explanations);
check(
  'the explanation is grounded in the question bank',
  coachBody.explanations[0]?.explanation ===
    'In-Order traversal visits nodes in ascending order.',
);
check('the study plan points at a real topic', coachBody.studyPlan.length > 0, coachBody.studyPlan);
check(
  'generated questions are marked as AI generated',
  coachBody.practiceQuestions.every((question) => question.aiGenerated),
);

const cachedCoach = await call(
  '/api/coach',
  {
    method: 'POST',
    body: JSON.stringify({
      attemptId: 'smoke-attempt-1',
      questions: [{ questionId: 'smoke-dsa-1', selectedAnswer: 1 }],
    }),
  },
  token,
);
check(
  'the second identical request is served from the cache',
  (cachedCoach.body as { cached: boolean }).cached === true,
);

const unauthorized = await call('/api/coach', {
  method: 'POST',
  body: JSON.stringify({ questions: [{ questionId: 'smoke-dsa-1', selectedAnswer: 1 }] }),
});
check('an unauthenticated request is rejected', unauthorized.status === 401, unauthorized.status);
