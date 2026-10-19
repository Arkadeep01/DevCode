import { BANK_COUNTS } from '../../../data/bankCounts';
import './StatStrip.css';

const STATS = [
  { value: BANK_COUNTS.totalQuestions, label: 'Practice questions' },
  { value: BANK_COUNTS.totalTopics, label: 'Study topics' },
  { value: BANK_COUNTS.totalTracks, label: 'Skill tracks' },
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
