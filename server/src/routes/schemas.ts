import { z } from 'zod';

export const CoachAttemptsSchema = z.object({
  attemptId: z.string().min(1, 'Attempt ID is required'),
  questions: z.array(
    z.object({
      questionId: z.string().min(1, 'Question ID is required'),
      selectedIndex: z.number().int().min(0).nullable(),
    })
  )
    .min(1, 'At least one question is required')
    .max(50, 'Maximum 50 questions per attempt')
    .refine(
      (questions) => {
        const ids = new Set<string>();
        for (const q of questions) {
          if (ids.has(q.questionId)) {
            return false;
          }
          ids.add(q.questionId);
        }
        return true;
      },
      'Duplicate question IDs are not allowed'
    ),
});
