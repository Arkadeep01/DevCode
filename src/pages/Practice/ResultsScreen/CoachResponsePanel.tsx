import { Button } from '../../../components/Button/Button';
import { Tag } from '../../../components/Tag/Tag';
import { CodeBlock } from '../../../components/CodeBlock/CodeBlock';
import type { CoachResponse } from '../../../services/api';
import { toBankQuestions } from '../../../utils/coachQuestion';
import './CoachResponsePanel.css';

interface CoachResponsePanelProps {
  response: CoachResponse;
  /** Starts a practice session built from the AI-generated questions. */
  onPracticeQuestions?: (() => void) | undefined;
  onDismiss: () => void;
}

export function CoachResponsePanel({
  response,
  onPracticeQuestions,
  onDismiss,
}: CoachResponsePanelProps) {
  // Generated questions are validated against the Question contract before
  // they are allowed anywhere near the quiz engine.
  const practiceQuestions = toBankQuestions(response.practiceQuestions);

  const hasContent =
    response.explanations.length > 0 ||
    response.studyPlan.length > 0 ||
    practiceQuestions.length > 0;

  return (
    <section className="coach-panel" aria-labelledby="coach-panel-title">
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
                <details className="coach-panel__exp-detail">
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
                    to={`/study?topic=${encodeURIComponent(item.topicId)}`}
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
                <details className="coach-panel__practice-detail">
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
