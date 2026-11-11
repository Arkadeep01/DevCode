import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { execute, queryOne } from './helpers/sql.js';

const app = createApp();

async function registerCoachUser(): Promise<string> {
  const email = `coach-attempts-${Math.random().toString(36).slice(2, 12)}@example.com`;
  const response = await request(app).post('/api/auth/register').send({
    email,
    password: 'password123',
    displayName: 'Coach Attempts Tester',
  });

  expect(response.status).toBe(201);
  return response.body.token;
}

async function seedCoachQuestion(slug: string): Promise<{ id: number; slug: string }> {
  const row = await queryOne<{ id: number; slug: string }>(
    `
    INSERT INTO questions (slug, category, difficulty, prompt, options, correct_index, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING id, slug
  `,
    slug,
    'dsa',
    'Intermediate',
    'What is the main use of recursion?',
    JSON.stringify(['Option 1', 'Option 2', 'Option 3', 'Option 4']),
    0,
    'Mock explanation',
  );

  if (!row) throw new Error('failed to seed the question');
  return row;
}

beforeEach(async () => {
  await execute('DELETE FROM attempts');
  await execute('DELETE FROM submissions');
  await execute('DELETE FROM progress');
  await execute('DELETE FROM questions');
  await execute('DELETE FROM users');
});

describe('POST /api/attempts', () => {
  it('returns 401 when the attempts request is unauthenticated', async () => {
    const response = await request(app).post('/api/attempts').send({
      attemptId: 'attempt-1',
      questions: [{ questionId: 'dsa-b1', selectedIndex: 0 }],
    });

    expect(response.status).toBe(401);
  });

  it('returns 400 for an invalid attempts payload', async () => {
    const token = await registerCoachUser();

    const response = await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid attempt data');
  });

  it('returns 404 when the referenced question does not exist', async () => {
    const token = await registerCoachUser();

    const response = await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-1',
        questions: [{ questionId: 'does-not-exist', selectedIndex: 0 }],
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Question not found: does-not-exist');
  });

  it('returns 409 when attempting to duplicate a question submission', async () => {
    const token = await registerCoachUser();
    const question = await seedCoachQuestion('dsa-b1');

    const response1 = await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-1',
        questions: [{ questionId: question.slug, selectedIndex: 0 }],
      });

    expect(response1.status).toBe(201);

    const response2 = await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-1',
        questions: [{ questionId: question.slug, selectedIndex: 0 }],
      });

    expect(response2.status).toBe(409);
    expect(response2.body.error).toBe('You have already submitted an answer for question: dsa-b1');
  });

  it('returns 201 when creating a new attempt successfully', async () => {
    const token = await registerCoachUser();
    const question = await seedCoachQuestion('dsa-b1');

    const response = await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-1',
        questions: [{ questionId: question.slug, selectedIndex: 0 }],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.created).toBe(1);
    expect(response.body.skipped).toBe(0);
    expect(response.body.attemptId).toBe('attempt-1');

    const row = (await queryOne<{
      user_id: number;
      quiz_id: string;
      question_id: number;
      chosen_answer: number;
      correct_answer: number;
      is_correct: number;
      is_skipped: number;
    }>(
      'SELECT * FROM attempts WHERE user_id = (SELECT id FROM users)',
    )) as {
      user_id: number;
      quiz_id: string;
      question_id: number;
      chosen_answer: number;
      correct_answer: number;
      is_correct: number;
      is_skipped: number;
    };
    expect(row.user_id).toBeTruthy();
    expect(row.quiz_id).toBe('attempt-1');
    expect(row.question_id).toBe(question.id);
    expect(row.chosen_answer).toBe(0);
    expect(row.correct_answer).toBe(0);
    expect(row.is_correct).toBe(1);
    expect(row.is_skipped).toBe(0);
  });

  it('handles skipped questions correctly', async () => {
    const token = await registerCoachUser();
    const question = await seedCoachQuestion('dsa-b1');

    const response = await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-2',
        questions: [{ questionId: question.slug, selectedIndex: null }],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.created).toBe(0);
    expect(response.body.skipped).toBe(1);

    const row = (await queryOne<{ is_skipped: number; is_correct: number }>(
      'SELECT * FROM attempts WHERE user_id = (SELECT id FROM users) AND is_skipped = 1',
    )) as { is_skipped: number; is_correct: number };
    expect(row.is_skipped).toBe(1);
    expect(row.is_correct).toBe(0);
  });

  it('rejects duplicate question IDs in a single request', async () => {
    const token = await registerCoachUser();
    const question = await seedCoachQuestion('dsa-b1');

    const response = await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-3',
        questions: [
          { questionId: question.slug, selectedIndex: 0 },
          { questionId: question.slug, selectedIndex: 1 },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid attempt data');
  });

  it('persists the canonical focus area of the question', async () => {
    const token = await registerCoachUser();
    await execute(
      `INSERT INTO questions (slug, category, difficulty, prompt, options, correct_index, explanation, focus_area)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      'dsa-focus',
      'dsa',
      'Intermediate',
      'Which traversal is in-order?',
      JSON.stringify(['In-Order', 'Pre-Order', 'Post-Order', 'Level-Order']),
      0,
      'Mock explanation',
      'Focus Area: Binary Search Tree In-Order Traversal',
    );

    const response = await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-focus',
        questions: [{ questionId: 'dsa-focus', selectedIndex: 1 }],
      });

    expect(response.status).toBe(201);

    const row = (await queryOne<{ focus_area: string; track: string; is_correct: number }>(
      'SELECT focus_area, track, is_correct FROM attempts LIMIT 1',
    )) as { focus_area: string; track: string; is_correct: number };
    expect(row.focus_area).toBe('Focus Area: Binary Search Tree In-Order Traversal');
    expect(row.track).toBe('dsa');
    expect(row.is_correct).toBe(0);
  });

  it('persists nothing when one question in the batch is unknown', async () => {
    const token = await registerCoachUser();
    const question = await seedCoachQuestion('dsa-valid');

    const response = await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attemptId: 'attempt-partial',
        questions: [
          { questionId: question.slug, selectedIndex: 0 },
          { questionId: 'dsa-unknown', selectedIndex: 0 },
        ],
      });

    expect(response.status).toBe(404);

    const count = await queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM attempts');
    expect(count?.total).toBe(0);
  });

  it('keeps attempts separate per user', async () => {
    const firstToken = await registerCoachUser();
    const secondToken = await registerCoachUser();
    const question = await seedCoachQuestion('dsa-shared');

    await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({
        attemptId: 'attempt-shared',
        questions: [{ questionId: question.slug, selectedIndex: 0 }],
      });

    const response = await request(app)
      .post('/api/attempts')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({
        attemptId: 'attempt-shared',
        questions: [{ questionId: question.slug, selectedIndex: 0 }],
      });

    // The same quiz id from another user is a different attempt.
    expect(response.status).toBe(201);
    const count = await queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM attempts');
    expect(count?.total).toBe(2);
  });
});
