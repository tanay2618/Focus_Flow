import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import Alert from '../components/Alert.jsx';
import { Field, PasswordField } from '../components/Field.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useForm } from '../hooks/useForm.js';
import { getErrorMessage, getFieldErrors } from '../api/client.js';
import { validateLogin } from '../utils/validators.js';

export default function Login() {
  const { login, sessionExpired } = useAuth();
  const { errorFor, bind, handleSubmit, setServerErrors } = useForm({
    initialValues: { email: '', password: '' },
    validate: validateLogin,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const submit = handleSubmit(async ({ email, password }) => {
    setSubmitting(true);
    setFormError('');
    try {
      await login(email.trim(), password); // GuestRoute redirects once the user is set
    } catch (err) {
      if (err.response?.status === 401) setFormError('Incorrect email or password. Check them and try again.');
      else { setServerErrors(getFieldErrors(err)); setFormError(getErrorMessage(err)); }
      setSubmitting(false);
    }
  });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see what is due."
      footer={<>New to Focus Flow? <Link to="/signup">Create an account</Link></>}
    >
      <form className="form" onSubmit={submit} noValidate>
        {sessionExpired && !formError && <Alert type="info">Your session ended. Sign in again to continue.</Alert>}
        {formError && <Alert type="error">{formError}</Alert>}
        <Field id="email" type="email" label="Email" autoComplete="email" error={errorFor('email')} {...bind('email')} />
        <PasswordField id="password" label="Password" autoComplete="current-password" error={errorFor('password')} {...bind('password')} />
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
