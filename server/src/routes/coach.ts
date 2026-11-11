import { eq, desc } from 'drizzle-orm';
import { Router } from 'express';
import { CoachError, CoachProviderError } from '../coach/errors.js';
import { CoachRequest, CoachRequestSchema, CoachResponseSchema } from '../coach/contracts.js';
import type { CoachContextQuestion } from '../coach/types.js';
import { buildCoachContext } from '../coach/contextBuilder.js';
import { createCoachProvider } from '../coach/providerFactory.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { db } from '../db/client.js';
import { questions, attempts } from '../db/schema.js';
import { requireAuth } from '../auth/middleware.js';
import { env } from '../config/env.js';
import { CoachCache, buildCacheKey, normalizeAttemptContent } from '../coach/cache.js';
import { calculateCoachAnalytics, toContextCoachAnalytics } from '../coach/analytics.js';
import { resolveStudyTopicId } from '../coach/topicMap.js';
import { sanitizeCoachResponse } from '../coach/sanitize.js';

export const coachRouter = Router();

const coachRateLimiter = createRateLimiter({
  windowMs: env.COACH_RATE_LIMIT_WINDOW_MS,
  max: env.COACH_RATE_LIMIT_MAX,
});

const coachCache = new CoachCache();

/**
 * In-flight requests, keyed by the cache key. Two identical requests that
 * arrive at the same time share one provider call instead of paying for two
 * generations (Layer D: prevent duplicate or conflicting requests).
 */
const inFlight = new Map<string, Promise<unknown>>();

async function resolveCoachQuestions(
  inputs: CoachRequest['questions'],
): Promise<CoachContextQuestion[]> {
  const resolved: CoachContextQuestion[] = [];

  for (const input of inputs) {
    const row = await (
      /^\d+$/.test(input.questionId)
        ? db.select().from(questions).where(eq(questions.id, Number(input.questionId)))
        : db.select().from(questions).where(eq(questions.slug, input.questionId))
    ).get();

    if (!row) {
      throw new CoachError(`Question not found: ${input.questionId}`, 404);
    }

    resolved.push({
      questionId: row.slug,
      selectedAnswer: input.selectedAnswer,
      correctAnswer: row.correctIndex,
      explanation: row.explanation,
      focusArea: row.focusArea,
      topicId: resolveStudyTopicId(row.category, row.focusArea),
      category: row.category,
    });
  }

  return resolved;
}

/**
 * Builds the deterministic analytics snapshot for the user. The AI never
 * computes accuracy itself - it receives the numbers computed here.
 */
async function buildUserAnalytics(userId: number) {
  const historicalAttempts = await db
    .select()
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .orderBy(desc(attempts.createdAt))
    .limit(500);

  if (historicalAttempts.length === 0) return null;

  const allQuestions = await db.select().from(questions);
  return toContextCoachAnalytics(calculateCoachAnalytics(historicalAttempts, allQuestions));
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

    const userId = req.userId ?? 0;
    const attemptId = parsed.data.attemptId ?? null;

    // Canonical answers are resolved from the database; the client's
    // selectedAnswer is only used to know what was picked.
    const resolvedQuestions = await resolveCoachQuestions(parsed.data.questions);

    const provider = createCoachProvider();
    const contentHash = normalizeAttemptContent(userId, parsed.data.questions, attemptId);
    const cacheKey = buildCacheKey({ userId, contentHash, model: provider.name });

    const cached = coachCache.get(cacheKey);
    if (cached !== null) {
      const validation = CoachResponseSchema.safeParse(cached);
      if (validation.success) {
        res.json({
          ...sanitizeCoachResponse(
            validation.data,
            resolvedQuestions.map((question) => question.questionId),
          ),
          cached: true,
        });
        return;
      }
      // Corrupt entry - drop it and regenerate.
      coachCache.set(cacheKey, null, 0);
    }

    const pending = inFlight.get(cacheKey);
    if (pending) {
      const shared = await pending;
      const validation = CoachResponseSchema.safeParse(shared);
      if (validation.success) {
        res.json({
          ...sanitizeCoachResponse(
            validation.data,
            resolvedQuestions.map((question) => question.questionId),
          ),
          cached: true,
        });
        return;
      }
      throw new CoachProviderError('Coach provider returned an invalid response');
    }

    const generation = (async () => {
      const context = buildCoachContext({
        userId,
        attemptId,
        questions: resolvedQuestions,
        analytics: (await buildUserAnalytics(userId)) ?? undefined,
      });

      const response = await provider.generate(context);
      const validation = CoachResponseSchema.safeParse(response);

      if (!validation.success) {
        throw new CoachProviderError('Coach provider returned an invalid response');
      }

      coachCache.set(cacheKey, validation.data, env.COACH_CACHE_TTL_MS);
      return validation.data;
    })();

    inFlight.set(cacheKey, generation);

    try {
      const result = await generation;
      res.json({
        ...sanitizeCoachResponse(
          result,
          resolvedQuestions.map((question) => question.questionId),
        ),
        cached: false,
      });
    } finally {
      inFlight.delete(cacheKey);
    }
  } catch (error) {
    next(error);
  }
});
