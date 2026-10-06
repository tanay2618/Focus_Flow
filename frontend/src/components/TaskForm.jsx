import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Field } from './Field.jsx';
import Alert from './Alert.jsx';
import { useForm } from '../hooks/useForm.js';
import { getErrorMessage, getFieldErrors } from '../api/client.js';
import { validateTaskForm } from '../utils/validators.js';
import { fromInputValue, defaultDueValue } from '../utils/dates.js';
import { CATEGORIES, PRIORITIES, STATUSES } from '../utils/constants.js';

export const emptyTask = () => ({
  title: '', description: '', category: 'Assignment', priority: 'medium', status: 'pending', dueDate: defaultDueValue(),
});

/** Shared by Add task and Edit task. `onSubmit` receives the API payload and may throw an axios error. */
export default function TaskForm({ initialValues, submitLabel, onSubmit, cancelTo = '/tasks' }) {
  const form = useForm({ initialValues: initialValues ?? emptyTask(), validate: validateTaskForm });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const { values, errorFor, bind, handleSubmit, setServerErrors } = form;

  const submit = handleSubmit(async () => {
    setSubmitting(true);
    setFormError('');
    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category,
        priority: values.priority,
        status: values.status,
        dueDate: fromInputValue(values.dueDate),
      });
    } catch (err) {
      setServerErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err, 'We could not save this task. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form className="form card" onSubmit={submit} noValidate>
      {formError && <Alert type="error">{formError}</Alert>}

      <Field id="title" label="Title" type="text" autoComplete="off"
        placeholder="e.g. Operating Systems lab report" error={errorFor('title')} {...bind('title')} />

      <Field id="description" as="textarea" label="Description" rows={4} placeholder="Notes, links or what done looks like (optional)"
        hint={`${values.description.length}/2000`} error={errorFor('description')} {...bind('description')} />

      <div className="form__row">
        <Field id="category" as="select" label="Category" {...bind('category')}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Field>
        <Field id="priority" as="select" label="Priority" {...bind('priority')}>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Field>
      </div>

      <div className="form__row">
        <Field id="dueDate" type="datetime-local" label="Due date and time" error={errorFor('dueDate')} {...bind('dueDate')} />
        <Field id="status" as="select" label="Status" {...bind('status')}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Field>
      </div>

      <div className="form__actions">
        <Link to={cancelTo} className="btn btn--ghost">Cancel</Link>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
