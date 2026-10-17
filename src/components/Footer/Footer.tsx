import { Logo } from '../Logo/Logo';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <Logo size="sm" />
        <p className="footer__tagline">Build the skill. Bring the confidence.</p>
        <p className="footer__note">Made for your next big step &#10022;</p>
      </div>
    </footer>
  );
}
