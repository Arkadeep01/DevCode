import { TRACKS, totalQuestionCount } from '../../../data/questions';
import { STUDY_TOPICS } from '../../../data/studyTopics';
import './StatStrip.css';

const STATS = [
  { value: totalQuestionCount(), label: 'Practice questions' },
  { value: STUDY_TOPICS.length, label: 'Study topics' },
  { value: TRACKS.length, label: 'Skill tracks' },
  { value: 3, label: 'Difficulty levels' },
];

export function StatStrip() {
  return (
    <section className="stat-strip" aria-label="Platform stats">
      <dl className="stat-strip__inner">
        {STATS.map((stat) => (
          <div key={stat.label} className="stat-strip__item">
            <dt className="stat-strip__label">{stat.label}</dt>
            <dd className="stat-strip__value">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
