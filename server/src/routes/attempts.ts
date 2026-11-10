import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { CoachError } from '../coach/errors.js';
import { attempts, questions, type NewAttempt } from '../db/schema.js';
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

    const { attemptId, questions: attemptQuestions } = parsed.data;
    const userId = req.userId!;

    // Resolve every question against the canonical store first, so a bad
    // question id fails the whole request instead of persisting half of it.
    const resolved: Array<{ questionId: string; attempt: NewAttempt }> = [];

    for (const q of attemptQuestions) {
      const question = db.select().from(questions).where(eq(questions.slug, q.questionId)).get();

      if (!question) {
        throw new CoachError(`Question not found: ${q.questionId}`, 404);
      }

      // Correctness is always derived from the database, never from the client.
      const isSkipped = q.selectedIndex === null;
      const isCorrect = !isSkipped && q.selectedIndex === question.correctIndex;

      resolved.push({
        questionId: q.questionId,
        attempt: {
          userId,
          quizId: attemptId,
          questionId: question.id,
          chosenAnswer: q.selectedIndex,
          correctAnswer: question.correctIndex,
          isCorrect,
          isSkipped,
          track: question.category,
          difficulty: question.difficulty,
          focusArea: question.focusArea,
        },
      });
    }

    // One transaction: a failed insert rolls the whole attempt back so a
    // partially persisted attempt can never be analysed.
    let inserted: Array<typeof attempts.$inferSelect> = [];

    try {
      inserted = db.transaction((tx) =>
        tx.insert(attempts).values(resolved.map((entry) => entry.attempt)).returning().all(),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        // Report the first question that was already submitted for this quiz.
        const duplicate = findDuplicate(userId, attemptId, resolved);
        throw new CoachError(
          `You have already submitted an answer for question: ${duplicate}`,
          409,
        );
      }
      throw error;
    }

    const skipped = inserted.filter((row) => row.isSkipped).length;

    res.status(201).json({
      success: true,
      created: inserted.length - skipped,
      skipped,
      attemptId,
    });
  } catch (error) {
    next(error);
  }
});

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}

/** Finds the question slug that already exists for this user + quiz run. */
function findDuplicate(
  userId: number,
  attemptId: string,
  resolved: Array<{ questionId: string }>,
): string {
  const existing = db
    .select({ slug: questions.slug })
    .from(attempts)
    .innerJoin(questions, eq(attempts.questionId, questions.id))
    .where(and(eq(attempts.quizId, attemptId), eq(attempts.userId, userId)))
    .all()
    .map((row) => row.slug);

  for (const entry of resolved) {
    if (existing.includes(entry.questionId)) return entry.questionId;
  }

  return resolved[0]?.questionId ?? 'unknown';
}
