import type { ReactNode } from 'react';
import './Tag.css';

export type TagVariant =
  | 'category'
  | 'difficulty'
  | 'info'
  | 'success'
  | 'danger'
  | 'warn'
  | 'flag';

export interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  className?: string;
}

export function Tag({ children, variant = 'difficulty', className }: TagProps) {
  return (
    <span className={['tag', `tag--${variant}`, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
