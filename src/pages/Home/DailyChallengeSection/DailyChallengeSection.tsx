import { Button } from '../../../components/Button/Button';
import { Card } from '../../../components/Card/Card';
import { CodeBlock } from '../../../components/CodeBlock/CodeBlock';
import { SectionHeader } from '../../../components/SectionHeader/SectionHeader';
import { Tag } from '../../../components/Tag/Tag';
import { DAILY_CHALLENGE } from '../../../data/dailyChallenge';
import { ROUTES, SECTION_IDS } from '../../../routes';
import './DailyChallengeSection.css';

export function DailyChallengeSection() {
  const challenge = DAILY_CHALLENGE;

  return (
    <section className="daily" id={SECTION_IDS.dailyChallenge} aria-labelledby="daily-title">
      <div className="daily__inner">
        <SectionHeader
          eyebrow="Daily challenge"
          title={<span id="daily-title">A five-minute warm-up.</span>}
          side="One hand-picked problem a day keeps the interview reflexes sharp."
        />
        <Card className="daily__card">
          <div className="daily__copy">
            <div className="daily__meta">
              <Tag variant="category">{challenge.topic}</Tag>
              <Tag variant="info">{challenge.minutes} min</Tag>
              <Tag variant="success">{challenge.difficulty}</Tag>
            </div>
            <h3 className="daily__title">{challenge.title}</h3>
            <p className="daily__text">{challenge.description}</p>
            <Button variant="primary" to={ROUTES.practice}>
              Solve the challenge &#8599;
            </Button>
          </div>
          <CodeBlock
            className="daily__code"
            code={challenge.code}
            lang={challenge.codeLang}
            numbered
          />
        </Card>
      </div>
    </section>
  );
}
