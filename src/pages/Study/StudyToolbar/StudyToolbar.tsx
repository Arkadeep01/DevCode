import { TOPIC_CATEGORIES, countTopicsInCategory } from '../../../data/studyTopics';
import type { CategoryFilter, TagFilter } from '../useStudyFilters';
import './StudyToolbar.css';

const TAG_FILTERS: { value: TagFilter; label: string }[] = [
  { value: 'all', label: 'All flags' },
  { value: 'high_freq', label: 'High frequency' },
  { value: 'company_fav', label: 'Company favorite' },
  { value: 'core', label: 'Core concept' },
];

interface StudyToolbarProps {
  total: number;
  category: CategoryFilter;
  onCategoryChange: (value: CategoryFilter) => void;
  tag: TagFilter;
  onTagChange: (value: TagFilter) => void;
  query: string;
  onQueryChange: (value: string) => void;
}

export function StudyToolbar({
  total,
  category,
  onCategoryChange,
  tag,
  onTagChange,
  query,
  onQueryChange,
}: StudyToolbarProps) {
  return (
    <div className="study-toolbar">
      <label className="study-toolbar__search">
        <span className="study-toolbar__search-label">Search topics</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by title or takeaway…"
        />
      </label>

      <div className="study-toolbar__row" role="group" aria-label="Filter by category">
        <button
          type="button"
          className={['study-toolbar__pill', category === 'all' ? 'study-toolbar__pill--active' : ''].join(' ')}
          aria-pressed={category === 'all'}
          onClick={() => onCategoryChange('all')}
        >
          All topics
          <span className="study-toolbar__count">{total}</span>
        </button>
        {TOPIC_CATEGORIES.map((meta) => (
          <button
            key={meta.id}
            type="button"
            className={['study-toolbar__pill', category === meta.id ? 'study-toolbar__pill--active' : ''].join(' ')}
            aria-pressed={category === meta.id}
            onClick={() => onCategoryChange(meta.id)}
          >
            {meta.label}
            <span className="study-toolbar__count">{countTopicsInCategory(meta.id)}</span>
          </button>
        ))}
      </div>

      <div className="study-toolbar__row" role="group" aria-label="Filter by flag">
        {TAG_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={[
              'study-toolbar__pill',
              'study-toolbar__pill--tag',
              tag === option.value ? 'study-toolbar__pill--active' : '',
            ].join(' ')}
            aria-pressed={tag === option.value}
            onClick={() => onTagChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
