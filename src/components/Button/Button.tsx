import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useGuardedNavigate } from '../NavigationGuard/useGuardedNavigate';
import './Button.css';

export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'teal' | 'white' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Internal route — renders a react-router Link. */
  to?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  onClick,
  type = 'button',
  disabled = false,
  className,
  ariaLabel,
}: ButtonProps) {
  const guardNavigation = useGuardedNavigate();
  const classes = ['btn', `btn--${variant}`, `btn--${size}`, className]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link
        to={to}
        className={classes}
        aria-label={ariaLabel}
        onClick={(event) => {
          if (!guardNavigation(event, to)) onClick?.();
        }}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
