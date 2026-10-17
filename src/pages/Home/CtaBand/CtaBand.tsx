import { Button } from '../../../components/Button/Button';
import { Eyebrow } from '../../../components/Eyebrow/Eyebrow';
import { ROUTES, SECTION_IDS } from '../../../routes';
import './CtaBand.css';

export function CtaBand() {
  return (
    <section className="cta-band" id={SECTION_IDS.whyDevcode} aria-labelledby="cta-title">
      <div className="cta-band__inner">
        <Eyebrow tone="light" dot>
          Why DevCode
        </Eyebrow>
        <h2 className="cta-band__title" id="cta-title">
          Built for the moment that matters.
        </h2>
        <p className="cta-band__text">
          No sign-up walls, no filler. Study a topic, run a timed quiz, review
          every miss — then walk in and tell your story with receipts.
        </p>
        <div className="cta-band__actions">
          <Button variant="white" size="lg" to={ROUTES.practice}>
            Start practicing &#8599;
          </Button>
          <Button variant="ghost" size="lg" to={`${ROUTES.study}?category=must_know`}>
            Tell your story
          </Button>
        </div>
      </div>
    </section>
  );
}
