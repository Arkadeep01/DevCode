import { useEffect, useRef } from 'react';
import { Button } from '../../../components/Button/Button';
import { Tag } from '../../../components/Tag/Tag';
import { CodeBlock } from '../../../components/CodeBlock/CodeBlock';
import { COACH_PANEL_ANCHOR } from '../../../routes';
import type { CoachResponse } from '../../../services/api';
import { toBankQuestions } from '../../../utils/coachQuestion';
import './CoachResponsePanel.css';

interface CoachResponsePanelProps {
  response: CoachResponse;
  /** Ids of the sections the user had expanded; restored after a navigation. */
  expandedSections?: string[] | undefined;
  /** Reports that a section was expanded or collapsed. */
  onToggleExpanded?: ((sectionId: string, isOpen: boolean) => void) | undefined;
  /** Starts a practice session built from the AI-generated questions. */
  onPracticeQuestions?: (() => void) | undefined;
  /** Called before the user leaves for the Study hub. */
  onOpenStudyTopic?: (() => void) | undefined;
  onDismiss: () => void;
}

export function CoachResponsePanel({
  response,
  expandedSections,
  onToggleExpanded,
  onPracticeQuestions,
  onOpenStudyTopic,
  onDismiss,
}: CoachResponsePanelProps) {
  // Generated questions are validated against the Question contract before
  // they are allowed anywhere near the quiz engine.
  const practiceQuestions = toBankQuestions(response.practiceQuestions);

  // The <details> elements stay uncontrolled so the browser owns the open
  // state; the expanded ids are only used to restore it after a navigation.
  const detailsRefs = useRef(new Map<string, HTMLDetailsElement>());

  useEffect(() => {
    const wanted = expandedSections ?? [];
    for (const [sectionId, element] of detailsRefs.current) {
      if (!element) continue;
      const shouldBeOpen = wanted.includes(sectionId);
      if (shouldBeOpen && !element.open) element.open = true;
      if (!shouldBeOpen && element.open) element.open = false;
    }
  }, [expandedSections]);

  const registerDetails = (sectionId: string) => (element: HTMLDetailsElement | null) => {
    if (element) detailsRefs.current.set(sectionId, element);
    else detailsRefs.current.delete(sectionId);
  };

  const hasContent =
    response.explanations.length > 0 ||
    response.studyPlan.length > 0 ||
    practiceQuestions.length > 0;

  return (
    <section
      className="coach-panel"
      id={COACH_PANEL_ANCHOR}
      aria-labelledby="coach-panel-title"
    >
      <header className="coach-panel__header">
        <h2 className="coach-panel__title" id="coach-panel-title" tabIndex={-1}>
          AI Coach
          {response.cached ? <span className="coach-panel__cached">cached</span> : null}
        </h2>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </header>

      {response.explanations.length > 0 ? (
        <section className="coach-panel__section" aria-labelledby="coach-explanations">
          <h3 id="coach-explanations" className="coach-panel__heading">
            Why you missed these
          </h3>
          <ul className="coach-panel__explanations">
            {response.explanations.map((explanation) => (
              <li key={explanation.questionId} className="coach-panel__explanation">
                <details
                  className="coach-panel__exp-detail"
                  ref={registerDetails(explanation.questionId)}
                  onToggle={(event) =>
                    onToggleExpanded?.(explanation.questionId, event.currentTarget.open)
                  }
                >
                  <summary className="coach-panel__exp-summary">
                    <span className="coach-panel__exp-question-id">
                      {explanation.questionId}
                    </span>
                    <span className="coach-panel__exp-concept">{explanation.concept}</span>
                  </summary>
                  <div className="coach-panel__exp-body">
                    <p className="coach-panel__exp-why-wrong">
                      <strong>Why this was wrong: </strong>
                      {explanation.whyWrong}
                    </p>
                    <p className="coach-panel__exp-explanation">
                      <strong>Reference: </strong>
                      {explanation.explanation}
                    </p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {response.studyPlan.length > 0 ? (
        <section className="coach-panel__section" aria-labelledby="coach-study-plan">
          <h3 id="coach-study-plan" className="coach-panel__heading">
            Your study plan
          </h3>
          <ol className="coach-panel__study-plan">
            {response.studyPlan.map((item) => (
              <li key={item.topicId} className="coach-panel__study-item">
                <div className="coach-panel__study-header">
                  <span className="coach-panel__study-priority">
                    Priority {item.priority}
                  </span>
                  <span className="coach-panel__study-topic-id">{item.topicId}</span>
                </div>
                <p className="coach-panel__study-reason">{item.reason}</p>
                <div className="coach-panel__study-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    to={`/study?topic=${encodeURIComponent(item.topicId)}&from=results`}
                    onClick={onOpenStudyTopic}
                  >
                    Open in Study hub
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {practiceQuestions.length > 0 ? (
        <section className="coach-panel__section" aria-labelledby="coach-practice">
          <h3 id="coach-practice" className="coach-panel__heading">
            Practice questions
          </h3>
          <ul className="coach-panel__practice-questions">
            {practiceQuestions.map((question, index) => (
              <li key={question.id} className="coach-panel__practice-item">
                <details
                  className="coach-panel__practice-detail"
                  ref={registerDetails(question.id)}
                  onToggle={(event) =>
                    onToggleExpanded?.(question.id, event.currentTarget.open)
                  }
                >
                  <summary className="coach-panel__practice-summary">
                    <span className="coach-panel__practice-number">
                      Practice {index + 1}
                    </span>
                    <Tag variant="category">{question.categoryLabel}</Tag>
                    <Tag variant="difficulty">{question.difficulty}</Tag>
                    {question.aiGenerated ? (
                      <span className="coach-panel__ai-badge">AI generated</span>
                    ) : null}
                  </summary>
                  <div className="coach-panel__practice-body">
                    <p className="coach-panel__practice-question">{question.question}</p>
                    {question.codeSnippet ? (
                      <CodeBlock code={question.codeSnippet} copyable className="coach-panel__code" />
                    ) : null}
                    <ol className="coach-panel__practice-options">
                      {question.options.map((option, optionIndex) => (
                        <li
                          key={optionIndex}
                          className={[
                            'coach-panel__practice-option',
                            optionIndex === question.correctIndex
                              ? 'coach-panel__practice-option--correct'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <span className="coach-panel__practice-letter">
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          {option}
                        </li>
                      ))}
                    </ol>
                    <p className="coach-panel__practice-explanation">
                      <strong>Explanation: </strong>
                      {question.explanation}
                    </p>
                    <p className="coach-panel__practice-focus">{question.focusArea}</p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
          {onPracticeQuestions ? (
            <div className="coach-panel__practice-actions">
              <Button size="sm" onClick={onPracticeQuestions}>
                Practice these {practiceQuestions.length} question
                {practiceQuestions.length === 1 ? '' : 's'}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {!hasContent ? (
        <div className="coach-panel__empty">
          <p>Clean sweep — nothing to review. Try a harder track.</p>
        </div>
      ) : null}
    </section>
  );
}
