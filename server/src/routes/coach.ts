import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { CoachError, CoachProviderError } from '../coach/errors.js';
import { CoachRequest, CoachRequestSchema, CoachResponseSchema } from '../coach/contracts.js';
import type { CoachContextQuestion } from '../coach/types.js';
import { buildCoachContext } from '../coach/contextBuilder.js';
import { createCoachProvider } from '../coach/providerFactory.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { db } from '../db/client.js';
import { questions } from '../db/schema.js';
import { requireAuth } from '../auth/middleware.js';
import { env } from '../config/env.js';

export const coachRouter = Router();

const coachRateLimiter = createRateLimiter({ windowMs: env.COACH_RATE_LIMIT_WINDOW_MS, max: env.COACH_RATE_LIMIT_MAX });

async function resolveCoachQuestions(
  inputs: CoachRequest['questions'],
): Promise<CoachContextQuestion[]> {
  const resolved: CoachContextQuestion[] = [];

  for (const input of inputs) {
    const row = /^\d+$/.test(input.questionId)
      ? db.select().from(questions).where(eq(questions.id, Number(input.questionId))).get()
      : db.select().from(questions).where(eq(questions.slug, input.questionId)).get();

    if (!row) {
      throw new CoachError(`Question not found: ${input.questionId}`, 404);
    }

    resolved.push({
      questionId: row.slug,
      selectedAnswer: input.selectedAnswer,
      correctAnswer: row.correctIndex,
      explanation: row.explanation,
      focusArea: row.category,
      topicId: null,
      category: row.category,
    });
  }

  return resolved;
}

coachRouter.post('/', requireAuth, coachRateLimiter, async (req, res, next) => {
  try {
    const parsed = CoachRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const context = buildCoachContext({
      userId: req.userId ?? 0,
      attemptId: parsed.data.attemptId ?? null,
      questions: await resolveCoachQuestions(parsed.data.questions),
    });

    const provider = createCoachProvider();
    const response = await provider.generate(context);
    const validation = CoachResponseSchema.safeParse(response);

    if (!validation.success) {
      throw new CoachProviderError('Coach provider returned an invalid response');
    }

    res.json({
      explanations: validation.data.explanations,
      studyPlan: validation.data.studyPlan,
      practiceQuestions: validation.data.practiceQuestions,
    });
  } catch (error) {
    next(error);
  }
});