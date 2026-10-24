export type AuthMode = 'login' | 'signup';
export type Field = 'email' | 'password' | 'displayName';
export type FieldErrors = Partial<Record<Field, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateFields(
  mode: AuthMode,
  email: string,
  password: string,
  displayName: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (email.length === 0) {
    errors.email = 'Email is required.';
  } else if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (mode === 'login') {
    if (password.length === 0) errors.password = 'Password is required.';
  } else {
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (password.length > 128) {
      errors.password = 'Password must be 128 characters or fewer.';
    }

    if (displayName.length < 2 || displayName.length > 60) {
      errors.displayName = 'Display name must be 2 to 60 characters.';
    }
  }

  return errors;
}
