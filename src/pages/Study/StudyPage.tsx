import { useCallback, useState } from 'react';
import { Button } from '../../components/Button/Button';
import { Eyebrow } from '../../components/Eyebrow/Eyebrow';
import { useToast } from '../../components/Toast/ToastContext';
import type { StudyTopic } from '../../types/topic';
import { useDocumentTitle } from '../../utils/useDocumentTitle';
import { StudyToolbar } from './StudyToolbar/StudyToolbar';
import { TopicCard } from './TopicCard/TopicCard';
import { TopicDetail } from './TopicDetail/TopicDetail';
import { useStudyFilters } from './useStudyFilters';
import { useTopicProgress } from './useTopicProgress';
import './StudyPage.css';

export function StudyPage() {
  useDocumentTitle('Study Hub | DevCode');

  const { category, setCategory, tag, setTag, query, setQuery, filtered, total } =
    useStudyFilters();
  const { mastered, bookmarks, toggleMastered, toggleBookmark } = useTopicProgress();
  const [selected, setSelected] = useState<StudyTopic | null>(null);
  const toast = useToast();

  const handleToggleMastered = (topic: StudyTopic) => {
    const { added } = toggleMastered(topic.id);
    toast.show(added ? 'Marked as mastered' : 'Mastery cleared');
  };

  const handleToggleBookmark = (topic: StudyTopic) => {
    const { added } = toggleBookmark(topic.id);
    toast.show(added ? 'Saved to bookmarks' : 'Removed from bookmarks');
  };

  const resetFilters = () => {
    setCategory('all');
    setTag('all');
    setQuery('');
  };

  const closeDetail = useCallback(() => setSelected(null), []);

  return (
    <div className="study">
      <header className="study__hero">
        <div className="study__hero-inner">
          <Eyebrow dot>Study hub</Eyebrow>
          <h1 className="study__title" tabIndex={-1}>Topics that pay off.</h1>
          <p className="study__sub">
            Fifteen battle-tested topics across DSA, languages, databases and
            systems. Read the pattern, learn the pitfalls, mark what you master.
          </p>
        </div>
      </header>

      <div className="study__body">
        <StudyToolbar
          total={total}
          category={category}
          onCategoryChange={setCategory}
          tag={tag}
          onTagChange={setTag}
          query={query}
          onQueryChange={setQuery}
        />

        <p className="study__count" role="status">
          Showing {filtered.length} of {total} topics
        </p>

        {filtered.length > 0 ? (
          <div className="study__grid">
            {filtered.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                mastered={mastered.has(topic.id)}
                bookmarked={bookmarks.has(topic.id)}
                onOpen={() => setSelected(topic)}
                onToggleMastered={() => handleToggleMastered(topic)}
                onToggleBookmark={() => handleToggleBookmark(topic)}
              />
            ))}
          </div>
        ) : (
          <div className="study__empty">
            <p>No topics match those filters.</p>
            <Button variant="subtle" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        )}
      </div>

      {selected ? (
        <TopicDetail
          topic={selected}
          mastered={mastered.has(selected.id)}
          bookmarked={bookmarks.has(selected.id)}
          onToggleMastered={() => handleToggleMastered(selected)}
          onToggleBookmark={() => handleToggleBookmark(selected)}
          onClose={closeDetail}
        />
      ) : null}
    </div>
  );
}
