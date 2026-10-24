import type { AuthMode, Field } from './validation';

interface AuthFieldProps {
  mode: AuthMode;
  field: Field;
  label: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
}

export function AuthField({
  mode,
  field,
  label,
  type,
  autoComplete,
  value,
  error,
  onChange,
}: AuthFieldProps) {
  const id = `${mode}-${field}`;
  const errorId = `${id}-error`;

  return (
    <div className="auth__field">
      <label className="auth__label" htmlFor={id}>
        {label}
      </label>
      <input
        className="auth__input"
        id={id}
        name={field}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p className="auth__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
