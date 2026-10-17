import type { ReactNode } from 'react';
import { Eyebrow, type EyebrowTone } from '../Eyebrow/Eyebrow';
import './SectionHeader.css';

export type SectionHeaderTone = 'light' | 'navy' | 'on-blue';

export interface SectionHeaderProps {
  eyebrow?: ReactNode;
  eyebrowTone?: EyebrowTone;
  title: ReactNode;
  side?: ReactNode;
  tone?: SectionHeaderTone;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  eyebrowTone = 'blue',
  title,
  side,
  tone = 'light',
  className,
}: SectionHeaderProps) {
  return (
    <header className={['section-header', `section-header--${tone}`, className].filter(Boolean).join(' ')}>
      <div className="section-header__main">
        {eyebrow ? <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow> : null}
        <h2 className="section-header__title">{title}</h2>
      </div>
      {side ? <p className="section-header__side">{side}</p> : null}
    </header>
  );
}
