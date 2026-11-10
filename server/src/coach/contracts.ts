import { z } from 'zod';

/**
 * Coach API contract (Layer A).
 *
 * The client describes the questions it wants the coach to reason about: which
 * question was attempted (stable question id) and which option was chosen. The
 * chosen index is advisory only - the server resolves the canonical answer from
 * its own question store and never trusts the client.
 */

export const CoachCategorySchema = z.enum([
  'dsa',
  'system_design',
  'oop',
  'sql',
  'web',
  'os',
  'python',
  'cpp',
  'java',
  'javascript',
]);

export const CoachDifficultySchema = z.enum(['Beginner', 'Intermediate', 'Advanced']);

export const CoachQuestionInputSchema = z.object({
  questionId: z.string().min(1).max(64),
  selectedAnswer: z.number().int().min(0).nullable(),
});

export const CoachRequestSchema = z
  .object({
    attemptId: z.string().min(1).max(64).optional(),
    questions: z.array(CoachQuestionInputSchema).min(1).max(50),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const question of value.questions) {
      if (seen.has(question.questionId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions'],
          message: `duplicate questionId ${question.questionId}`,
        });
        return;
      }
      seen.add(question.questionId);
    }
  });

export const CoachExplanationSchema = z.object({
  questionId: z.string().min(1).max(64),
  whyWrong: z.string().min(1).max(2000),
  concept: z.string().min(1).max(200),
  explanation: z.string().min(1).max(4000),
});

export const CoachStudyPlanItemSchema = z.object({
  topicId: z.string().min(1).max(64),
  reason: z.string().min(1).max(1000),
  priority: z.number().int().min(1).max(5),
});

const coachPracticeQuestionFields = {
  id: z.string().min(1).max(64),
  category: CoachCategorySchema,
  categoryLabel: z.string().min(1).max(120),
  difficulty: CoachDifficultySchema,
  question: z.string().min(1).max(2000),
  codeSnippet: z.string().nullable(),
  options: z.array(z.string().min(1).max(500)).min(2).max(6),
  correctIndex: z.number().int().min(0).max(5),
  explanation: z.string().min(1).max(4000),
  focusArea: z.string().min(1).max(200),
};

/** Shared checks for a generated practice question. */
function validatePracticeQuestion(
  question: { correctIndex: number; options: string[] },
  ctx: z.RefinementCtx,
): void {
  if (question.correctIndex >= question.options.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['correctIndex'],
      message: 'correctIndex must point at an existing option',
    });
  }

  const seen = new Set<string>();
  for (const option of question.options) {
    const key = option.trim().toLowerCase();
    if (seen.has(key)) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'options must be unique',
      });
      return;
    }
    seen.add(key);
  }
}

/**
 * Strict schema for a practice question: `aiGenerated` must be exactly true
 * so generated questions are always recognisable downstream.
 */
export const CoachPracticeQuestionSchema = z
  .object({ ...coachPracticeQuestionFields, aiGenerated: z.literal(true) })
  .superRefine(validatePracticeQuestion);

/**
 * Draft schema used when reading provider output. `aiGenerated` is optional
 * here because a model may omit it; the server always stamps it afterwards.
 */
export const CoachPracticeQuestionDraftSchema = z
  .object({ ...coachPracticeQuestionFields, aiGenerated: z.literal(true).optional() })
  .superRefine(validatePracticeQuestion);

export const CoachResponseSchema = z.object({
  explanations: z.array(CoachExplanationSchema).max(50),
  studyPlan: z.array(CoachStudyPlanItemSchema).max(20),
  practiceQuestions: z.array(CoachPracticeQuestionSchema).max(5),
});

/** Schema for raw provider output, before the server stamps `aiGenerated`. */
export const CoachProviderResponseSchema = z.object({
  explanations: z.array(CoachExplanationSchema).max(50),
  studyPlan: z.array(CoachStudyPlanItemSchema).max(20),
  practiceQuestions: z.array(CoachPracticeQuestionDraftSchema).max(5),
});

export type CoachQuestionInput = z.infer<typeof CoachQuestionInputSchema>;
export type CoachRequest = z.infer<typeof CoachRequestSchema>;
export type CoachExplanation = z.infer<typeof CoachExplanationSchema>;
export type CoachStudyPlanItem = z.infer<typeof CoachStudyPlanItemSchema>;
export type CoachPracticeQuestion = z.infer<typeof CoachPracticeQuestionSchema>;
export type CoachResponse = z.infer<typeof CoachResponseSchema>;
export type CoachProviderResponse = z.infer<typeof CoachProviderResponseSchema>;
