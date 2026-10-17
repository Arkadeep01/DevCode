import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes';
import './Logo.css';

export interface LogoProps {
  size?: 'md' | 'sm';
}

export function Logo({ size = 'md' }: LogoProps) {
  return (
    <Link to={ROUTES.home} className={['logo', `logo--${size}`].join(' ')} aria-label="DevCode home">
      <span className="logo__mark" aria-hidden="true">
        &lt;/&gt;
      </span>
      <span className="logo__word">
        devcode
        <span className="logo__dot">.</span>
      </span>
    </Link>
  );
}
