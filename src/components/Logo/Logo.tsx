import { Link } from 'react-router-dom';
import logoDark2x from '../../assets/logo/devcode-logo-dark@2x.png';
import logoDarkWebp2x from '../../assets/logo/devcode-logo-dark@2x.webp';
import logoDark from '../../assets/logo/devcode-logo-dark.png';
import logoDarkWebp from '../../assets/logo/devcode-logo-dark.webp';
import logo2x from '../../assets/logo/devcode-logo@2x.png';
import logoWebp2x from '../../assets/logo/devcode-logo@2x.webp';
import logo from '../../assets/logo/devcode-logo.png';
import logoWebp from '../../assets/logo/devcode-logo.webp';
import { ROUTES } from '../../routes';
import { useTheme } from '../../theme/ThemeProvider';
import './Logo.css';

export interface LogoProps {
  size?: 'md' | 'sm';
}

const ASSETS = {
  light: {
    png: logo,
    png2x: logo2x,
    webp: logoWebp,
    webp2x: logoWebp2x,
  },
  dark: {
    png: logoDark,
    png2x: logoDark2x,
    webp: logoDarkWebp,
    webp2x: logoDarkWebp2x,
  },
} as const;

export function Logo({ size = 'md' }: LogoProps) {
  const { theme } = useTheme();
  const assets = ASSETS[theme];

  return (
    <Link
      to={ROUTES.home}
      className={['logo', `logo--${size}`].join(' ')}
      aria-label="DevCode home"
    >
      <picture>
        <source type="image/webp" srcSet={`${assets.webp} 1x, ${assets.webp2x} 2x`} />
        <img
          className="logo__img"
          src={assets.png}
          srcSet={`${assets.png} 1x, ${assets.png2x} 2x`}
          width={143}
          height={40}
          alt=""
          decoding="async"
        />
      </picture>
    </Link>
  );
}
