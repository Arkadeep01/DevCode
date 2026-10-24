import { Button } from '../../../components/Button/Button';
import { Card } from '../../../components/Card/Card';
import { Tag } from '../../../components/Tag/Tag';
import type { StudyTopic } from '../../../types/topic';
import { TAG_META } from '../tagMeta';
import './TopicCard.css';

interface TopicCardProps {
  topic: StudyTopic;
  mastered: boolean;
  bookmarked: boolean;
  onOpen: () => void;
  onToggleMastered: () => void;
  onToggleBookmark: () => void;
}

export function TopicCard({
  topic,
  mastered,
  bookmarked,
  onOpen,
  onToggleMastered,
  onToggleBookmark,
}: TopicCardProps) {
  return (
    <Card interactive className="topic-card">
      <div className="topic-card__head">
        <span className="topic-card__category">{topic.categoryLabel}</span>
        <button
          type="button"
          className={[
            'topic-card__bookmark',
            bookmarked ? 'topic-card__bookmark--on' : '',
          ].join(' ')}
          onClick={onToggleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? `Remove bookmark from ${topic.title}` : `Bookmark ${topic.title}`}
        >
          {bookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
      </div>

      <h3 className="topic-card__title">{topic.title}</h3>
      <p className="topic-card__takeaway">{topic.takeaway}</p>

      <div className="topic-card__tags">
        {topic.tags.map((tag) => (
          <Tag key={tag} variant={TAG_META[tag].variant}>
            {TAG_META[tag].label}
          </Tag>
        ))}
        <Tag variant="difficulty">{topic.difficulty}</Tag>
      </div>

      <div className="topic-card__actions">
        <Button size="sm" variant="subtle" onClick={onOpen}>
          Read topic &#8599;
        </Button>
        <Button
          size="sm"
          variant={mastered ? 'teal' : 'outline'}
          onClick={onToggleMastered}
          ariaLabel={mastered ? `Clear mastery for ${topic.title}` : `Mark ${topic.title} as mastered`}
        >
          {mastered ? 'Mastered' : 'Mark mastered'}
        </Button>
      </div>
    </Card>
  );
}
