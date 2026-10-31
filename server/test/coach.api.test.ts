import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { db, sqlite } from '../src/db/client.js';
import { questions } from '../src/db/schema.js';

const app = createApp();

async function registerCoachUser(): Promise<string> {
  const email = `coach-${Math.random().toString(36).slice(2, 12)}@example.com`;
  const response = await request(app).post('/api/auth/register').send({
    email,
    password: 'password123',
    displayName: 'Coach Tester',
  });

  expect(response.status).toBe(201);
  return response.body.token;
}

function seedCoachQuestion(slug: string) {
  return db.insert(questions).values({
    slug,
    category: 'dsa',
    difficulty: 'Beginner',
    prompt: 'Which traversal visits nodes in ascending order on a BST?',
    options: ['In-Order', 'Pre-Order', 'Post-Order', 'Level-Order'],
    correctIndex: 0,
    explanation: 'In-Order traversal visits nodes in ascending order.',
  }).returning().get();
}

beforeEach(() => {
  sqlite.prepare('DELETE FROM submissions').run();
  sqlite.prepare('DELETE FROM progress').run();
  sqlite.prepare('DELETE FROM questions').run();
  sqlite.prepare('DELETE FROM users').run();
});

describe('POST /api/coach', () => {
  it('returns 401 when the coach request is unauthenticated', async () => {
    const response = await request(app).post('/api/coach').send({
      questions: [{ questionId: 'dsa-b1', selectedAnswer: 0 }],
    });

    expect(response.status).toBe(401);
  });

  it('returns 400 for an invalid coach payload', async () => {
    const token = await registerCoachUser();

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid input');
  });

  it('returns 404 when the referenced question does not exist', async () => {
    const token = await registerCoachUser();

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [{ questionId: 'does-not-exist', selectedAnswer: 0 }] });

    expect(response.status).toBe(404);
  });

  it('returns a grounded coach response for a missed question', async () => {
    const token = await registerCoachUser();
    const question = seedCoachQuestion('coach-question-1');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-1',
        questions: [{ questionId: question.slug, selectedAnswer: 1 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.explanations).toHaveLength(1);
    expect(response.body.explanations[0].questionId).toBe('coach-question-1');
    expect(Array.isArray(response.body.studyPlan)).toBe(true);
    expect(Array.isArray(response.body.practiceQuestions)).toBe(true);
  });

  it('returns an empty coaching response when every answer was correct', async () => {
    const token = await registerCoachUser();
    const question = seedCoachQuestion('coach-question-2');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${token}`)
      .send({
        questions: [{ questionId: question.slug, selectedAnswer: 0 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.explanations).toEqual([]);
    expect(response.body.studyPlan).toEqual([]);
    expect(response.body.practiceQuestions).toEqual([]);
  });

  it('returns 429 when the coach rate limit is exceeded', async () => {
    const token = await registerCoachUser();
    const question = seedCoachQuestion('coach-question-3');

    let lastStatus = 0;
    for (let index = 0; index < 11; index += 1) {
      const response = await request(app)
        .post('/api/coach')
        .set('Authorization', `Bearer ${token}`)
        .send({ questions: [{ questionId: question.slug, selectedAnswer: 1 }] });
      lastStatus = response.status;
    }

    expect(lastStatus).toBe(429);
  });
});