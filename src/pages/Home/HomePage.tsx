import { CtaBand } from './CtaBand/CtaBand';
import { DailyChallengeSection } from './DailyChallengeSection/DailyChallengeSection';
import { Hero } from './Hero/Hero';
import { PathCards } from './PathCards/PathCards';
import { StatStrip } from './StatStrip/StatStrip';

export function HomePage() {
  return (
    <>
      <Hero />
      <StatStrip />
      <PathCards />
      <DailyChallengeSection />
      <CtaBand />
    </>
  );
}
