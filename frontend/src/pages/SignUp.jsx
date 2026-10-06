import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import Alert from '../components/Alert.jsx';
import { Field, PasswordField } from '../components/Field.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useForm } from '../hooks/useForm.js';
import { getErrorMessage, getFieldErrors } from '../api/client.js';
import { validateSignUp } from '../utils/validators.js';

export default function SignUp() {
  const { signUp } = useAuth();
  const { errorFor, bind, handleSubmit, setServerErrors } = useForm({
    initialValues: { name: '', email: '', password: '', confirmPassword: '' },
    validate: validateSignUp,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const submit = handleSubmit(async ({ name, email, password, confirmPassword }) => {
    setSubmitting(true);
    setFormError('');
    try {
      await signUp({ name: name.trim(), email: email.trim(), password, confirmPassword });
    } catch (err) {
      const fields = getFieldErrors(err);
      setServerErrors(fields);
      // Field messages are shown inline; only show the banner when nothing field-specific came back.
      setFormError(Object.keys(fields).length ? '' : getErrorMessage(err));
      setSubmitting(false);
    }
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free for students. Takes under a minute."
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <form className="form" onSubmit={submit} noValidate>
        {formError && <Alert type="error">{formError}</Alert>}
        <Field id="name" label="Full name" autoComplete="name" error={errorFor('name')} {...bind('name')} />
        <Field id="email" type="email" label="Email" autoComplete="email" error={errorFor('email')} {...bind('email')} />
        <PasswordField id="password" label="Password" autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number." error={errorFor('password')} {...bind('password')} />
        <PasswordField id="confirmPassword" label="Confirm password" autoComplete="new-password"
          error={errorFor('confirmPassword')} {...bind('confirmPassword')} />
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
