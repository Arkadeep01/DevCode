import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { Button } from '../../components/Button/Button';
import { ROUTES } from '../../routes';
import { ApiError } from '../../services/api';
import { useDocumentTitle } from '../../utils/useDocumentTitle';
import { AuthField } from './AuthField';
import { validateFields, type AuthMode, type Field, type FieldErrors } from './validation';
import './AuthPage.css';

interface AuthPageProps {
  mode: AuthMode;
}

export function AuthPage({ mode }: AuthPageProps) {
  const isSignup = mode === 'signup';
  useDocumentTitle(isSignup ? 'Sign up | DevCode' : 'Log in | DevCode');

  const { status, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  const redirectTo = state?.from ?? ROUTES.home;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />;
  }

  const updateField = (field: Field, value: string) => {
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
    if (field === 'displayName') setDisplayName(value);
    setErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = displayName.trim();
    const nextErrors = validateFields(mode, normalizedEmail, password, normalizedName);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormError('');
      return;
    }

    setErrors({});
    setFormError('');
    setSubmitting(true);

    try {
      if (isSignup) {
        await register({
          email: normalizedEmail,
          password,
          displayName: normalizedName,
        });
      } else {
        await login({ email: normalizedEmail, password });
      }
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const detailErrors: FieldErrors = {};
        for (const detail of error.details) {
          if (
            detail.path === 'email' ||
            detail.path === 'password' ||
            detail.path === 'displayName'
          ) {
            detailErrors[detail.path] = detail.message;
          }
        }
        setErrors(detailErrors);
        setFormError(error.message);
      } else {
        setFormError('Unable to connect. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth" aria-labelledby="auth-title">
      <div className="auth__panel">
        <header className="auth__header">
          <p className="auth__eyebrow">{isSignup ? 'Create account' : 'Welcome back'}</p>
          <h1 className="auth__title" id="auth-title">
            {isSignup ? 'Join DevCode.' : 'Log in to DevCode.'}
          </h1>
          <p className="auth__sub">
            {isSignup
              ? 'Save your progress, track mastery and keep every practice run in one place.'
              : 'Pick up your progress and keep your interview prep moving.'}
          </p>
        </header>

        <form className="auth__form" noValidate onSubmit={handleSubmit} aria-busy={submitting}>
          {formError ? (
            <p className="auth__form-error" role="alert">
              {formError}
            </p>
          ) : null}

          {isSignup ? (
            <AuthField
              mode={mode}
              field="displayName"
              label="Display name"
              type="text"
              autoComplete="name"
              value={displayName}
              error={errors.displayName}
              onChange={(value) => updateField('displayName', value)}
            />
          ) : null}

          <AuthField
            mode={mode}
            field="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            error={errors.email}
            onChange={(value) => updateField('email', value)}
          />

          <AuthField
            mode={mode}
            field="password"
            label="Password"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password}
            error={errors.password}
            onChange={(value) => updateField('password', value)}
          />

          <Button className="auth__submit" type="submit" disabled={submitting}>
            {submitting
              ? isSignup
                ? 'Creating account...'
                : 'Logging in...'
              : isSignup
                ? 'Create account'
                : 'Log in'}
          </Button>
        </form>

        <p className="auth__switch">
          {isSignup ? 'Already have an account?' : 'New to DevCode?'}
          <Button variant="ghost" size="sm" to={isSignup ? ROUTES.login : ROUTES.signup}>
            {isSignup ? 'Log in' : 'Create account'}
          </Button>
        </p>
      </div>
    </section>
  );
}
