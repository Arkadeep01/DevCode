import type { ReactNode } from 'react';
import './Card.css';

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** Adds the hover lift used for clickable-feeling cards. */
  interactive?: boolean;
  id?: string;
}

export function Card({ children, className, interactive = false, id }: CardProps) {
  return (
    <article
      id={id}
      className={['card', interactive ? 'card--interactive' : '', className].filter(Boolean).join(' ')}
    >
      {children}
    </article>
  );
}
