import { CoachProviderError } from './errors.js';
import { CoachResponseSchema } from './contracts.js';
import type { CoachContext } from './types.js';
import type { CoachProvider } from './provider.js';

export class MockCoachProvider implements CoachProvider {
  readonly name = 'mock';

  async generate(ctx: CoachContext): Promise<unknown> {
    const explanations = ctx.misses.map((miss) => ({
      questionId: miss.questionId,
      whyWrong:
        miss.explanation ?? `The correct approach differs on ${miss.focusArea ?? 'this topic'}.`,
      concept: miss.topicId ?? miss.focusArea ?? 'core concepts',
      explanation:
        miss.explanation ?? 'Mock explanation: revisit the underlying pattern with a focused quiz.',
    }));

    const studyPlan = ctx.weakTopics.map((topic) => ({
      topicId: topic.topicId ?? `coach-topic-${topic.misses}`,
      reason: `Mock reason: ${topic.misses} repeated miss(es) on ${topic.focusArea ?? 'topic'}.`,
      priority: topic.priority,
    }));

    const practiceQuestions = ctx.weakTopics.slice(0, 3).map((topic, index) => ({
      id: `coach-mock-${topic.topicId ?? `topic-${topic.misses}`}-${index + 1}`,
      category: 'dsa',
      categoryLabel: 'Data Structures & Algorithms',
      difficulty: 'Intermediate',
      question: `Mock AI practice question derived from ${topic.focusArea ?? 'the weak topic'}.`,
      codeSnippet: null,
      options: ['Apply the standard pattern', 'Optimize prematurely', 'Skip validation', 'Guess randomly'],
      correctIndex: 0,
      explanation: `Mock explanation for ${topic.focusArea ?? 'the weak topic'}.`,
      focusArea: topic.focusArea ?? 'Focus Area: General Weakness',
    }));

    const response = { explanations, studyPlan, practiceQuestions };
    const parsed = CoachResponseSchema.safeParse(response);

    if (!parsed.success) {
      throw new CoachProviderError('Mock coach produced an invalid response');
    }

    return parsed.data;
  }
}