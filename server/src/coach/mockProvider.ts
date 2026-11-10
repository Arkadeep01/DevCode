import { CoachProviderError } from './errors.js';
import { CoachResponseSchema } from './contracts.js';
import type { CoachContext } from './types.js';
import type { CoachProvider } from './provider.js';

/**
 * Deterministic provider used for local development, tests, and as the
 * fallback whenever no provider API key is configured. It never calls out to
 * a model, so it always produces the same answer for the same context.
 */
export class MockCoachProvider implements CoachProvider {
  readonly name = 'mock';

  async generate(ctx: CoachContext): Promise<unknown> {
    const explanations = ctx.misses.map((miss) => ({
      questionId: miss.questionId,
      whyWrong:
        miss.explanation ??
        `Your answer targeted a different approach than the expected one on ${
          miss.focusArea ?? 'this topic'
        }.`,
      concept: miss.focusArea ?? miss.topicId ?? 'core concept',
      explanation:
        miss.explanation ??
        'Review the canonical explanation for this question and re-derive the answer step by step.',
    }));

    // One study plan entry per distinct Study topic, strongest miss first.
    const seenTopics = new Set<string>();
    const studyPlan = ctx.weakTopics
      .filter((topic) => topic.topicId !== null)
      .filter((topic) => {
        if (seenTopics.has(topic.topicId as string)) return false;
        seenTopics.add(topic.topicId as string);
        return true;
      })
      .map((topic, index) => ({
        topicId: topic.topicId as string,
        reason: `You missed ${topic.misses} question(s) covering ${
          topic.focusArea ?? 'this topic'
        }.`,
        priority: index + 1,
      }));

    const practiceQuestions = ctx.weakTopics
      .filter((topic) => topic.topicId !== null)
      .slice(0, 3)
      .map((topic, index) => ({
        id: `coach-mock-${topic.topicId}-${index + 1}`,
        category: 'dsa',
        categoryLabel: 'Data Structures & Algorithms',
        difficulty: 'Intermediate',
        question: `Practice question: apply the ${
          topic.focusArea ?? 'reviewed concept'
        } pattern in a new scenario.`,
        codeSnippet: null,
        options: [
          'Apply the documented pattern directly',
          'Optimize before measuring',
          'Skip input validation',
          'Guess and move on',
        ],
        correctIndex: 0,
        explanation: `The documented pattern for ${
          topic.focusArea ?? 'this topic'
        } handles this case correctly.`,
        focusArea: topic.focusArea ?? 'Focus Area: General Review',
        aiGenerated: true as const,
      }));

    const response = { explanations, studyPlan, practiceQuestions };
    const parsed = CoachResponseSchema.safeParse(response);

    if (!parsed.success) {
      throw new CoachProviderError('Mock coach produced an invalid response');
    }

    return parsed.data;
  }
}
