import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { CoachError } from '../coach/errors.js';
import { attempts, type NewAttempt } from '../db/schema.js';
import { db } from '../db/client.js';
import { and, eq } from 'drizzle-orm';
import { CoachAttemptsSchema } from './schemas.js';

export const attemptsRouter = Router();

attemptsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = CoachAttemptsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new CoachError('Invalid attempt data', 400);
    }

    const { attemptId, questions } = parsed.data;
    const userId = req.userId!;

    const createdAttempts: NewAttempt[] = [];
    const skippedQuestions: NewAttempt[] = [];

    for (const q of questions) {
      const question = await db.query.questions.findFirst({
        where: (questions) => eq(questions.slug, q.questionId),
      });

      if (!question) {
        throw new CoachError(`Question not found: ${q.questionId}`, 404);
      }

      const isCorrect = q.selectedIndex !== null && q.selectedIndex === question.correctIndex;
      const isSkipped = q.selectedIndex === null;

      const attempt: NewAttempt = {
        userId,
        quizId: attemptId,
        questionId: question.id,
        chosenAnswer: q.selectedIndex,
        correctAnswer: question.correctIndex,
        isCorrect: isCorrect ?? false,
        isSkipped: isSkipped ?? false,
        track: question.category,
        difficulty: question.difficulty,
        focusArea: question.category,
      };

      try {
        const inserted = await db.insert(attempts).values(attempt).returning();
        if (q.selectedIndex === null) {
          skippedQuestions.push(inserted[0]);
        } else {
          createdAttempts.push(inserted[0]);
        }
      } catch (err: any) {
        if (err.message.includes('UNIQUE constraint failed')) {
          throw new CoachError(`You have already submitted an answer for question: ${q.questionId}`, 409);
        }
        throw err;
      }
    }

    res.status(201).json({
      success: true,
      created: createdAttempts.length,
      skipped: skippedQuestions.length,
      attemptId,
    });
  } catch (error) {
    next(error);
  }
});
