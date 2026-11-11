import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/client.js';
import { questions } from '../src/db/schema.js';
import { STUDY_TOPIC_IDS } from '../src/coach/topicMap.js';
import { execute } from './helpers/sql.js';

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

async function seedCoachQuestion(slug: string) {
  const [row] = await db
    .insert(questions)
    .values({
      slug,
      category: 'dsa',
      difficulty: 'Beginner',
      prompt: 'Which traversal visits nodes in ascending order on a BST?',
      options: ['In-Order', 'Pre-Order', 'Post-Order', 'Level-Order'],
      correctIndex: 0,
      explanation: 'In-Order traversal visits nodes in ascending order.',
      focusArea: 'Focus Area: Binary Search Tree In-Order Traversal',
    })
    .returning();

  return row;
}

beforeEach(async () => {
  await execute('DELETE FROM submissions');
  await execute('DELETE FROM progress');
  await execute('DELETE FROM questions');
  await execute('DELETE FROM users');
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
    const question = await seedCoachQuestion('coach-question-1');

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
    const question = await seedCoachQuestion('coach-question-2');

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
    const question = await seedCoachQuestion('coach-question-3');

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

  it('explains a miss using the canonical explanation from the question store', async () => {
    const token = await registerCoachUser();
    const question = await seedCoachQuestion('coach-question-4');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-explain',
        questions: [{ questionId: question.slug, selectedAnswer: 2 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.explanations).toHaveLength(1);
    expect(response.body.explanations[0].questionId).toBe('coach-question-4');
    expect(response.body.explanations[0].explanation).toBe(
      'In-Order traversal visits nodes in ascending order.',
    );
  });

  it('produces a study plan that only points at real study topics', async () => {
    const token = await registerCoachUser();
    const question = await seedCoachQuestion('coach-question-5');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-plan',
        questions: [{ questionId: question.slug, selectedAnswer: 1 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.studyPlan.length).toBeGreaterThan(0);
    for (const item of response.body.studyPlan) {
      expect(STUDY_TOPIC_IDS).toContain(item.topicId);
    }
  });

  it('marks the generated practice questions as AI generated', async () => {
    const token = await registerCoachUser();
    const question = await seedCoachQuestion('coach-question-6');

    const response = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-practice',
        questions: [{ questionId: question.slug, selectedAnswer: 1 }],
      });

    expect(response.status).toBe(200);
    for (const practiceQuestion of response.body.practiceQuestions) {
      expect(practiceQuestion.aiGenerated).toBe(true);
    }
  });

  it('only computes analytics from the requesting user’s own attempts', async () => {
    const owner = await registerCoachUser();
    const other = await registerCoachUser();
    const question = await seedCoachQuestion('coach-question-7');

    // The first user records a wrong attempt.
    const attemptResponse = await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${owner}`)
      .send({
        attemptId: 'attempt-owner',
        questions: [{ questionId: question.slug, selectedIndex: 1 }],
      });
    expect(attemptResponse.status).toBe(201);

    const ownerResponse = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${owner}`)
      .send({
        attemptId: 'attempt-owner',
        questions: [{ questionId: question.slug, selectedAnswer: 1 }],
      });

    const otherResponse = await request(app)
      .post('/api/coach')
      .set('Authorization', `Bearer ${other}`)
      .send({
        attemptId: 'attempt-other',
        questions: [{ questionId: question.slug, selectedAnswer: 1 }],
      });

    expect(ownerResponse.status).toBe(200);
    expect(otherResponse.status).toBe(200);
    // The second user has no history, so the coach cannot quote accuracy for
    // them; the response must not contain the first user's statistics.
    expect(JSON.stringify(otherResponse.body)).not.toContain('attempt-owner');
  });
});