import { useMemo, useState } from 'react';

/**
 * Small form helper: values, blur-based inline validation, and server-side field errors.
 * Errors show for a field once it has been touched or after the first submit attempt.
 */
export function useForm({ initialValues, validate }) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  const clientErrors = useMemo(() => validate(values), [values]); // eslint-disable-line react-hooks/exhaustive-deps

  const errorFor = (field) => ((touched[field] || submitted) && clientErrors[field]) || serverErrors[field] || '';

  const bind = (field) => ({
    value: values[field],
    onChange: (e) => {
      const { value } = e.target;
      setValues((v) => ({ ...v, [field]: value }));
      setServerErrors((s) => (s[field] ? { ...s, [field]: undefined } : s));
    },
    onBlur: () => setTouched((t) => ({ ...t, [field]: true })),
  });

  const handleSubmit = (onValid) => async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitted(true);
    if (Object.keys(clientErrors).length > 0) {
      requestAnimationFrame(() => form.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    await onValid(values);
  };

  return { values, errorFor, bind, handleSubmit, setServerErrors };
}
