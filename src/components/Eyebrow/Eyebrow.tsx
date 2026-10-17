import type { ReactNode } from 'react';
import './Eyebrow.css';

export type EyebrowTone = 'blue' | 'teal' | 'light' | 'navy';

export interface EyebrowProps {
  children: ReactNode;
  tone?: EyebrowTone;
  dot?: boolean;
  className?: string;
}

export function Eyebrow({ children, tone = 'blue', dot = false, className }: EyebrowProps) {
  return (
    <span className={['eyebrow', `eyebrow--${tone}`, className].filter(Boolean).join(' ')}>
      {dot ? <span className="eyebrow__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
