import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { useScrollToSection } from '../../utils/scrollToSection';
import { Button } from '../Button/Button';
import { Logo } from '../Logo/Logo';
import { ThemeToggle } from '../../theme/ThemeToggle';
import { ROUTE_LINKS, SECTION_LINKS } from './navLinks';
import './Navbar.css';

export function Navbar() {
  const { pathname } = useLocation();
  const isHome = pathname === ROUTES.home;
  const scrollToSection = useScrollToSection();

  const sectionLinks = SECTION_LINKS.map((section) => (
    <button
      key={section.sectionId}
      type="button"
      className="navbar__link"
      onClick={() => scrollToSection(section.sectionId)}
    >
      {section.label}
    </button>
  ));

  const routeLinks = ROUTE_LINKS.map((link) => (
    <NavLink
      key={link.to}
      to={link.to}
      end={link.to === ROUTES.home}
      className={({ isActive }) =>
        ['navbar__link', isActive ? 'navbar__link--active' : ''].join(' ')
      }
    >
      {link.label}
    </NavLink>
  ));

  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar__inner">
        <Logo />

        <div className="navbar__links">
          {isHome && sectionLinks}
          {!isHome && routeLinks}
        </div>

        <div className="navbar__actions">
          <ThemeToggle />
          {isHome ? (
            <Button variant="outline" size="sm" to={ROUTES.practice} className="navbar__cta">
              Start practicing &#8599;
            </Button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
