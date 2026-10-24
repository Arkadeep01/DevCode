import { Button } from '../../../components/Button/Button';
import { Eyebrow } from '../../../components/Eyebrow/Eyebrow';
import { ROUTES, SECTION_IDS } from '../../../routes';
import { useScrollToSection } from '../../../utils/scrollToSection';
import heroBg from '../../../assets/hero-bg.jpg';
import './Hero.css';

export function Hero() {
  const scrollToSection = useScrollToSection();

  return (
    <section className="hero" aria-labelledby="hero-title">
      <img
        className="hero__bg"
        src={heroBg}
        alt=""
        aria-hidden="true"
        width={1600}
        height={1024}
        decoding="async"
        fetchPriority="high"
      />
      <span className="hero__scrim" aria-hidden="true" />
      <div className="hero__inner">
        <Eyebrow tone="blue" dot>
          Interview prep, reimagined
        </Eyebrow>
        <h1 id="hero-title" className="hero__title" tabIndex={-1}>
          Interview-ready.
          <br />
          <span className="hero__accent">Zero guesswork.</span>
        </h1>
        <p className="hero__sub">
          Sharpen the patterns behind real developer interviews — focused study
          topics and timed practice across ten skill tracks.
        </p>
        <div className="hero__actions">
          <Button variant="primary" size="lg" to={ROUTES.practice}>
            Start practicing &#8599;
          </Button>
          <Button variant="ghost" size="lg" onClick={() => scrollToSection(SECTION_IDS.studyPaths)}>
            Browse study paths
          </Button>
        </div>
      </div>
    </section>
  );
}
