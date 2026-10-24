import { useLocation } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { Eyebrow } from '../../components/Eyebrow/Eyebrow';
import { ROUTES } from '../../routes';
import { useDocumentTitle } from '../../utils/useDocumentTitle';
import './NotFoundPage.css';

export function NotFoundPage() {
  useDocumentTitle('Page not found | DevCode');

  const { pathname } = useLocation();

  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <Eyebrow dot>404</Eyebrow>
      <h1 className="not-found__title" id="not-found-title" tabIndex={-1}>
        This page took an early exit.
      </h1>
      <p className="not-found__sub">
        Nothing lives at <code className="not-found__path">{pathname}</code> — it may have
        been moved, or the link was mistyped.
      </p>
      <div className="not-found__actions">
        <Button to={ROUTES.home}>Back to home</Button>
        <Button variant="outline" to={ROUTES.study}>
          Browse study topics
        </Button>
      </div>
    </section>
  );
}
