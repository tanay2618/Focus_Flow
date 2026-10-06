import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TaskItem from '../components/TaskItem.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Field } from '../components/Field.jsx';
import { EmptyState, ErrorState, LinkButton, ListSkeleton } from '../components/Feedback.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useTaskActions } from '../hooks/useTaskActions.js';
import { tasksApi } from '../api/endpoints.js';
import { CATEGORIES, PRIORITIES, STATUSES } from '../utils/constants.js';

const FILTER_KEYS = ['status', 'priority', 'category'];

export default function Tasks() {
  // Filters live in the URL so the list survives a refresh and the back button.
  const [params, setParams] = useSearchParams();
  const [searchText, setSearchText] = useState(params.get('q') ?? '');

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (searchText.trim()) next.set('q', searchText.trim()); else next.delete('q');
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  const hasFilters = Boolean(params.get('q')) || FILTER_KEYS.some((k) => params.get(k));
  const clearFilters = () => { setSearchText(''); setParams({}, { replace: true }); };

  const query = params.toString();
  const { data, loading, error, reload } = useFetch(async () => {
    const tasks = await tasksApi.list({
      search: params.get('q'), status: params.get('status'), priority: params.get('priority'),
      category: params.get('category'), sort: 'dueDate',
    });
    return { tasks, now: new Date() };
  }, [query]);
  const actions = useTaskActions(reload);

  // Unfinished work first (soonest deadline on top), completed tasks after it.
  const tasks = useMemo(() => {
    const list = data?.tasks ?? [];
    return [...list.filter((t) => t.status !== 'completed'), ...list.filter((t) => t.status === 'completed')];
  }, [data]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>All tasks</h1>
          <p className="muted" aria-live="polite">
            {data ? `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}${hasFilters ? ' match your filters' : ''}` : 'Loading…'}
          </p>
        </div>
        <LinkButton to="/tasks/new">Add task</LinkButton>
      </div>

      <form className="filters card" role="search" onSubmit={(e) => e.preventDefault()}>
        <Field id="search" type="search" label="Search by title" placeholder="Search tasks"
          value={searchText} onChange={(e) => setSearchText(e.target.value)} autoComplete="off" />
        <Field id="status" as="select" label="Status" value={params.get('status') ?? ''} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Field>
        <Field id="priority" as="select" label="Priority" value={params.get('priority') ?? ''} onChange={(e) => setFilter('priority', e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Field>
        <Field id="category" as="select" label="Category" value={params.get('category') ?? ''} onChange={(e) => setFilter('category', e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Field>
        {hasFilters && <button type="button" className="btn btn--ghost filters__clear" onClick={clearFilters}>Clear filters</button>}
      </form>

      {loading && !data ? <ListSkeleton />
        : error && !data ? <ErrorState message={error} onRetry={reload} />
        : tasks.length === 0 ? (
          hasFilters ? (
            <EmptyState title="No tasks match these filters" description="Try a different search or clear the filters."
              action={<button type="button" className="btn btn--primary" onClick={clearFilters}>Clear filters</button>} />
          ) : (
            <EmptyState title="No tasks yet" description="Add your first assignment, exam or reading and it will show up here."
              action={<LinkButton to="/tasks/new">Add your first task</LinkButton>} />
          )
        ) : (
          <ul className={`task-list${loading ? ' is-refreshing' : ''}`}>
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} now={data.now} busy={actions.busyId === task.id}
                onComplete={actions.complete} onDelete={actions.requestDelete} />
            ))}
          </ul>
        )}

      <ConfirmDialog
        open={Boolean(actions.pendingDelete)}
        title="Delete this task?"
        message={actions.pendingDelete ? `"${actions.pendingDelete.title}" will be removed permanently. This cannot be undone.` : ''}
        busy={actions.deleting}
        onConfirm={actions.confirmDelete}
        onCancel={actions.cancelDelete}
      />
    </>
  );
}
