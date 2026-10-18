import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button } from '../../../components/Button/Button';
import { CodeBlock } from '../../../components/CodeBlock/CodeBlock';
import { Tag } from '../../../components/Tag/Tag';
import { getFocusableElements, inertBackground } from '../../../utils/dialogFocus';
import { sanitizeRichText } from '../../../utils/sanitizeRichText';
import type { StudyTopic } from '../../../types/topic';
import { TAG_META } from '../TopicCard/TopicCard';
import './TopicDetail.css';

interface TopicDetailProps {
  topic: StudyTopic;
  mastered: boolean;
  bookmarked: boolean;
  onToggleMastered: () => void;
  onToggleBookmark: () => void;
  onClose: () => void;
}

export function TopicDetail({
  topic,
  mastered,
  bookmarked,
  onToggleMastered,
  onToggleBookmark,
  onClose,
}: TopicDetailProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    closeRef.current?.focus();

    const overlay = overlayRef.current;
    const restoreBackground = overlay ? inertBackground(overlay) : () => undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreBackground();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  const handleTabTrap = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusables = getFocusableElements(panel);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !panel.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !panel.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="topic-detail" ref={overlayRef} onClick={onClose}>
      <div
        ref={panelRef}
        className="topic-detail__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="topic-detail-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleTabTrap}
      >
        <div className="topic-detail__top">
          <div className="topic-detail__tags">
            <Tag variant="category">{topic.categoryLabel}</Tag>
            {topic.tags.map((tag) => (
              <Tag key={tag} variant={TAG_META[tag].variant}>
                {TAG_META[tag].label}
              </Tag>
            ))}
            <Tag variant="difficulty">{topic.difficulty}</Tag>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="topic-detail__close"
            onClick={onClose}
            aria-label="Close topic"
          >
            Close
          </button>
        </div>

        <h2 className="topic-detail__title" id="topic-detail-title">
          {topic.title}
        </h2>
        <p className="topic-detail__takeaway">{topic.takeaway}</p>

        <div className="topic-detail__actions">
          <Button
            variant={mastered ? 'teal' : 'outline'}
            size="sm"
            onClick={onToggleMastered}
          >
            {mastered ? 'Mastered' : 'Mark mastered'}
          </Button>
          <Button
            variant="subtle"
            size="sm"
            onClick={onToggleBookmark}
          >
            {bookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
        </div>

        <section className="topic-detail__section">
          <h3 className="topic-detail__heading">Deep dive</h3>
          <ul className="topic-detail__list">
            {topic.deepDive.map((item, index) => (
              <li
                key={index}
                className="topic-detail__list-item"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(item) }}
              />
            ))}
          </ul>
        </section>

        <section className="topic-detail__section">
          <h3 className="topic-detail__heading">Reference implementation</h3>
          <CodeBlock code={topic.codeSnippet} lang={topic.codeLang} copyable />
        </section>

        <section className="topic-detail__section">
          <h3 className="topic-detail__heading">Common pitfalls</h3>
          <ul className="topic-detail__list topic-detail__list--pitfalls">
            {topic.pitfalls.map((item, index) => (
              <li
                key={index}
                className="topic-detail__list-item"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(item) }}
              />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
