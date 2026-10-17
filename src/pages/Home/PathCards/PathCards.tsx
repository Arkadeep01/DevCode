import { Link } from 'react-router-dom';
import { SectionHeader } from '../../../components/SectionHeader/SectionHeader';
import { Card } from '../../../components/Card/Card';
import { Tag } from '../../../components/Tag/Tag';
import { countTopicsInCategory } from '../../../data/studyTopics';
import { ROUTES, SECTION_IDS } from '../../../routes';
import type { TopicCategory } from '../../../types/topic';
import './PathCards.css';

interface PathMeta {
  id: TopicCategory;
  title: string;
  description: string;
}

const PATHS: PathMeta[] = [
  {
    id: 'dsa',
    title: 'Core DSA Patterns',
    description:
      'Two pointers, sliding windows, trees, graphs and dynamic programming — the repeatable patterns behind most interview problems.',
  },
  {
    id: 'must_know',
    title: 'Must-Know Interview Questions',
    description:
      'The classics every interviewer loves: time complexity, concurrency, API design and trade-off reasoning.',
  },
  {
    id: 'language',
    title: 'Language Masterclass',
    description:
      'Deep dives into Python, C++, Java and JavaScript internals — memory models, runtimes and performance traps.',
  },
  {
    id: 'db_sys',
    title: 'Database & System Fundamentals',
    description:
      'Indexes, transactions, caching and scaling — the systems vocabulary behind backend interview rounds.',
  },
];

export function PathCards() {
  return (
    <section className="paths" id={SECTION_IDS.studyPaths} aria-labelledby="paths-title">
      <div className="paths__inner">
        <SectionHeader
          eyebrow="Study paths"
          title={<span id="paths-title">Pick a track. Master it.</span>}
          side="Four curated paths, fifteen topics — every one written for the room where you whiteboard."
        />
        <div className="paths__grid">
          {PATHS.map((path) => (
            <Card key={path.id} interactive className="paths__card">
              <Tag variant="category">{countTopicsInCategory(path.id)} topics</Tag>
              <h3 className="paths__card-title">{path.title}</h3>
              <p className="paths__card-text">{path.description}</p>
              <Link className="paths__card-link" to={`${ROUTES.study}?category=${path.id}`}>
                Explore path &#8599;
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
