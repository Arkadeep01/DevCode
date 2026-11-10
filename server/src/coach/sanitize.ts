import type { CoachResponse } from './contracts.js';
import { isStudyTopicId } from './topicMap.js';

/**
 * Server-side output validation (Layer D step 8).
 *
 * The provider is an untrusted source even when it is the real LLM: it may
 * reference questions that were not part of the attempt, invent Study topic
 * ids, or repeat the same topic twice. Sanitising here keeps the response
 * truthful about what was actually attempted and guarantees every study plan
 * entry points at a real Study topic.
 */

/**
 * Keeps only the parts of the coach response that are provably tied to the
 * attempt. The response must already have passed `CoachResponseSchema`.
 */
export function sanitizeCoachResponse(
  response: CoachResponse,
  allowedQuestionIds: Iterable<string>,
): CoachResponse {
  const allowed = new Set(allowedQuestionIds);

  const explanations = response.explanations.filter((explanation) =>
    allowed.has(explanation.questionId),
  );

  const seenTopics = new Set<string>();
  const studyPlan = response.studyPlan
    .filter((item) => isStudyTopicId(item.topicId))
    .filter((item) => {
      if (seenTopics.has(item.topicId)) return false;
      seenTopics.add(item.topicId);
      return true;
    })
    .sort((a, b) => a.priority - b.priority)
    .map((item, index) => ({ ...item, priority: index + 1 }));

  const practiceQuestions = response.practiceQuestions.map((question) => ({
    ...question,
    aiGenerated: true as const,
  }));

  return { explanations, studyPlan, practiceQuestions };
}
