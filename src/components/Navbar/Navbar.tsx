import { useContext, useEffect, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../../auth/AuthContext';
import { ROUTES } from '../../routes';
import { useScrollToSection } from '../../utils/scrollToSection';
import { Button } from '../Button/Button';
import { Logo } from '../Logo/Logo';
import { useGuardedNavigate } from '../NavigationGuard/useGuardedNavigate';
import { ThemeToggle } from '../../theme/ThemeToggle';
import { ROUTE_LINKS, SECTION_LINKS } from './navLinks';
import './Navbar.css';

export function Navbar() {
  const { pathname } = useLocation();
  const isHome = pathname === ROUTES.home;
  const scrollToSection = useScrollToSection();
  const guardNavigation = useGuardedNavigate();
  const auth = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const closeMenu = () => setMenuOpen(false);

  const handleRouteClick = (event: ReactMouseEvent<HTMLAnchorElement>, to: string) => {
    if (!guardNavigation(event, to)) closeMenu();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !menuOpen) return;
    setMenuOpen(false);
    toggleRef.current?.focus();
  };

  const sectionLinks = SECTION_LINKS.map((section) => (
    <button
      key={section.sectionId}
      type="button"
      className="navbar__link"
      onClick={() => {
        scrollToSection(section.sectionId);
        closeMenu();
      }}
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
      onClick={(event) => handleRouteClick(event, link.to)}
    >
      {link.label}
    </NavLink>
  ));

  const practiceCta = (modifier: 'mobile' | 'desktop') => (
    <Button
      variant="outline"
      size="sm"
      to={ROUTES.practice}
      className={`navbar__cta navbar__cta--${modifier}`}
    >
      Start practicing &#8599;
    </Button>
  );

  const authLinks = (modifier: 'mobile' | 'desktop') => {
    if (auth?.status === 'loading') return null;

    return (
      <div className={`navbar__auth navbar__auth--${modifier}`}>
        {auth?.status === 'authenticated' && auth.user ? (
          <>
            <span className="navbar__user" title={auth.user.displayName}>
              {auth.user.displayName}
            </span>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => {
                auth.logout();
                closeMenu();
              }}
            >
              Log out
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" to={ROUTES.login}>
              Log in
            </Button>
            <Button variant="subtle" size="sm" to={ROUTES.signup}>
              Sign up
            </Button>
          </>
        )}
      </div>
    );
  };

  return (
    <nav className="navbar" aria-label="Main" onKeyDown={handleKeyDown}>
      <div className="navbar__inner">
        <Logo />

        <div
          id="navbar-nav"
          className={menuOpen ? 'navbar__links navbar__links--open' : 'navbar__links'}
        >
          {isHome && sectionLinks}
          {!isHome && routeLinks}
          {isHome ? practiceCta('mobile') : null}
          {authLinks('mobile')}
        </div>

        <div className="navbar__actions">
          {authLinks('desktop')}
          <ThemeToggle />
          {isHome ? practiceCta('desktop') : null}
          <button
            ref={toggleRef}
            type="button"
            className={menuOpen ? 'navbar__toggle navbar__toggle--open' : 'navbar__toggle'}
            aria-expanded={menuOpen}
            aria-controls="navbar-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="navbar__toggle-bar" />
            <span className="navbar__toggle-bar" />
            <span className="navbar__toggle-bar" />
          </button>
        </div>
      </div>
    </nav>
  );
}
