import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/client.js';
import { questions, users } from '../src/db/schema.js';
import { CoachProviderError, CoachProviderUnavailableError } from '../src/coach/errors.js';
import { execute } from './helpers/sql.js';

/**
 * The provider is injected through the factory so the tests can simulate
 * upstream failures and malformed output without touching a real model.
 */
const providerState = vi.hoisted(() => ({
  generate: vi.fn(),
  calls: 0,
}));

vi.mock('../src/coach/providerFactory.js', () => ({
  createCoachProvider: () => ({
    name: 'test',
    generate: (ctx: unknown) => {
      providerState.calls += 1;
      return providerState.generate(ctx);
    },
  }),
}));

const app = createApp();

async function registerUser(prefix: string): Promise<{ token: string; id: number }> {
  const email = `${prefix}-${Math.random().toString(36).slice(2, 12)}@example.com`;
  const response = await request(app).post('/api/auth/register').send({
    email,
    password: 'password123',
    displayName: 'Security Tester',
  });

  expect(response.status).toBe(201);
  const id = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).get())?.id;
  return { token: response.body.token, id: id ?? 0 };
}

async function seedQuestion(slug: string, focusArea = 'Focus Area: Two Sum Hash Map Linear Scan') {
  const [row] = await db
    .insert(questions)
    .values({
      slug,
      category: 'dsa',
      difficulty: 'Intermediate',
      prompt: 'Which traversal visits nodes in ascending order on a BST?',
      options: ['In-Order', 'Pre-Order', 'Post-Order', 'Level-Order'],
      correctIndex: 0,
      explanation: 'In-Order traversal visits nodes in ascending order.',
      focusArea,
    })
    .returning();

  return row;
}

const VALID_PROVIDER_OUTPUT = {
  explanations: [
    {
      questionId: 'coach-sec-1',
      whyWrong: 'The answer targeted the wrong data structure.',
      concept: 'Focus Area: Two Sum Hash Map Linear Scan',
      explanation: 'In-Order traversal visits nodes in ascending order.',
    },
  ],
  studyPlan: [{ topicId: 'must-b-trees-vs-hash', reason: 'Two misses.', priority: 1 }],
  practiceQuestions: [
    {
      id: 'coach-q-1',
      category: 'dsa',
      categoryLabel: 'Data Structures & Algorithms',
      difficulty: 'Intermediate',
      question: 'What is the average lookup cost of a hash map?',
      codeSnippet: null,
      options: ['O(1)', 'O(n)'],
      correctIndex: 0,
      explanation: 'Average case is constant.',
      focusArea: 'Focus Area: Hash Maps',
      aiGenerated: true,
    },
  ],
};

beforeEach(async () => {
  providerState.generate.mockReset();
  providerState.calls = 0;
  await execute('DELETE FROM attempts');
  await execute('DELETE FROM submissions');
  await execute('DELETE FROM progress');
  await execute('DELETE FROM questions');
  await execute('DELETE FROM users');
});

describe('POST /api/coach — security and failure handling', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await request(app).post('/api/coach').send({
      questions: [{ questionId: 'coach-sec-1', selectedAnswer: 1 }],
    });

    expect(response.status).toBe(401);
  });

  it('rejects a request with an invalid bearer token', async () => {
    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ questions: [{ questionId: 'coach-sec-1', selectedAnswer: 1 }] });

    expect(response.status).toBe(401);
  });

  it('never returns another user’s cached response', async () => {
    providerState.generate.mockResolvedValue(VALID_PROVIDER_OUTPUT);
    const first = await registerUser('owner');
    const second = await registerUser('other');
    seedQuestion('coach-sec-1');

    const payload = {
      attemptId: 'attempt-shared',
      questions: [{ questionId: 'coach-sec-1', selectedAnswer: 1 }],
    };

    const ownerResponse = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${first.token}`)
      .send(payload);

    const otherResponse = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${second.token}`)
      .send(payload);

    expect(ownerResponse.status).toBe(200);
    expect(otherResponse.status).toBe(200);
    // The second user must not be served the first user's cached entry.
    expect(providerState.calls).toBe(2);
    expect(otherResponse.body.cached).toBe(false);
  });

  it('serves a cached response for a repeated identical request', async () => {
    providerState.generate.mockResolvedValue(VALID_PROVIDER_OUTPUT);
    const user = await registerUser('cache');
    seedQuestion('coach-sec-1');

    const payload = {
      attemptId: 'attempt-cache',
      questions: [{ questionId: 'coach-sec-1', selectedAnswer: 1 }],
    };

    const first = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${user.token}`)
      .send(payload);
    const second = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${user.token}`)
      .send(payload);

    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(false);
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(providerState.calls).toBe(1);
    expect(second.body.explanations).toEqual(first.body.explanations);
  });

  it('returns 502 when the provider fails', async () => {
    providerState.generate.mockRejectedValue(new CoachProviderError('upstream exploded'));
    const user = await registerUser('failure');
    seedQuestion('coach-sec-1');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ questions: [{ questionId: 'coach-sec-1', selectedAnswer: 1 }] });

    expect(response.status).toBe(502);
    expect(response.body.error).toBe('upstream exploded');
  });

  it('returns 503 when the provider is unavailable', async () => {
    providerState.generate.mockRejectedValue(
      new CoachProviderUnavailableError('Coach provider API key is not configured'),
    );
    const user = await registerUser('unavailable');
    seedQuestion('coach-sec-1');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ questions: [{ questionId: 'coach-sec-1', selectedAnswer: 1 }] });

    expect(response.status).toBe(503);
  });

  it('returns 502 when the provider returns a malformed payload', async () => {
    providerState.generate.mockResolvedValue({ explanations: 'not-an-array' });
    const user = await registerUser('malformed');
    seedQuestion('coach-sec-1');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ questions: [{ questionId: 'coach-sec-1', selectedAnswer: 1 }] });

    expect(response.status).toBe(502);
  });

  it('never leaks internal exception details to the client', async () => {
    providerState.generate.mockRejectedValue(
      new Error('connection string postgres://user:secret@host/db failed'),
    );
    const user = await registerUser('leak');
    seedQuestion('coach-sec-1');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ questions: [{ questionId: 'coach-sec-1', selectedAnswer: 1 }] });

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('rejects a study plan entry pointing at a topic that does not exist', async () => {
    providerState.generate.mockResolvedValue({
      ...VALID_PROVIDER_OUTPUT,
      studyPlan: [{ topicId: 'FAKE_TOPIC_ID', reason: 'invented', priority: 1 }],
    });
    const user = await registerUser('faketopic');
    seedQuestion('coach-sec-1');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ questions: [{ questionId: 'coach-sec-1', selectedAnswer: 1 }] });

    expect(response.status).toBe(200);
    expect(response.body.studyPlan).toEqual([]);
  });

  it('drops explanations for questions that were not attempted', async () => {
    providerState.generate.mockResolvedValue({
      ...VALID_PROVIDER_OUTPUT,
      explanations: [
        ...VALID_PROVIDER_OUTPUT.explanations,
        {
          questionId: 'never-attempted',
          whyWrong: 'invented',
          concept: 'invented',
          explanation: 'invented',
        },
      ],
    });
    const user = await registerUser('hallucination');
    seedQuestion('coach-sec-1');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ questions: [{ questionId: 'coach-sec-1', selectedAnswer: 1 }] });

    expect(response.status).toBe(200);
    expect(response.body.explanations.map((item: { questionId: string }) => item.questionId)).toEqual([
      'coach-sec-1',
    ]);
  });

  it('ignores a client supplied correctness value and uses the canonical answer', async () => {
    providerState.generate.mockResolvedValue({
      ...VALID_PROVIDER_OUTPUT,
      explanations: [],
    });
    const user = await registerUser('canonical');
    const question = await seedQuestion('coach-sec-1');

    // The client claims the answer was correct; the server must not trust it.
    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        questions: [{ questionId: question.slug, selectedAnswer: 1 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.explanations).toEqual([]);
    expect(providerState.generate).toHaveBeenCalledTimes(1);

    const ctx = providerState.generate.mock.calls[0]?.[0] as {
      misses: Array<{ correctAnswer: number; selectedAnswer: number }>;
    };
    expect(ctx.misses[0]?.correctAnswer).toBe(0);
    expect(ctx.misses[0]?.selectedAnswer).toBe(1);
  });

  it('returns 404 for a question that does not exist', async () => {
    const user = await registerUser('missing');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ questions: [{ questionId: 'does-not-exist', selectedAnswer: 0 }] });

    expect(response.status).toBe(404);
    expect(providerState.calls).toBe(0);
  });

  it('returns 400 for a malformed request body', async () => {
    const user = await registerUser('malformed-body');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ questions: 'not-an-array' });

    expect(response.status).toBe(400);
    expect(providerState.calls).toBe(0);
  });
});
