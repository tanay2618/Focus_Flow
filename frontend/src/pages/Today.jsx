import TaskItem from '../components/TaskItem.jsx';
import { EmptyState, ErrorState, LinkButton, ListSkeleton } from '../components/Feedback.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useTaskActions } from '../hooks/useTaskActions.js';
import { tasksApi } from '../api/endpoints.js';
import { groupByUrgency } from '../utils/tasks.js';

const SECTIONS = [
  { key: 'overdue', title: 'Overdue', note: 'Past due, so start here' },
  { key: 'dueToday', title: 'Due today', note: 'Earliest deadline first' },
  { key: 'highPriority', title: 'High priority', note: 'Due later, but important' },
];

export default function Today() {
  const { data, loading, error, reload } = useFetch(async () => {
    const tasks = await tasksApi.list({ status: 'pending,in_progress', sort: 'dueDate' });
    const now = new Date();
    return { groups: groupByUrgency(tasks, now), now };
  }, []);
  const actions = useTaskActions(reload);

  const total = data ? SECTIONS.reduce((n, s) => n + data.groups[s.key].length, 0) : 0;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Today</h1>
          <p className="muted">{dateLabel}</p>
        </div>
        <LinkButton to="/tasks/new">Add task</LinkButton>
      </div>

      {loading && !data ? <ListSkeleton rows={5} />
        : error && !data ? <ErrorState message={error} onRetry={reload} />
        : total === 0 ? (
          <EmptyState title="You are clear for today"
            description="No overdue work, nothing due today, and no high-priority tasks waiting. Enjoy it, or get ahead."
            action={<LinkButton to="/tasks" variant="ghost">Browse all tasks</LinkButton>} />
        ) : (
          SECTIONS.map(({ key, title, note }) => {
            const items = data.groups[key];
            if (items.length === 0) return null;
            return (
              <section key={key} className="section" aria-labelledby={`${key}-heading`}>
                <div className="section__head">
                  <h2 id={`${key}-heading`}>{title} <span className={`count count--${key}`}>{items.length}</span></h2>
                  <span className="muted">{note}</span>
                </div>
                <ul className="task-list">
                  {items.map((task) => (
                    <TaskItem key={task.id} task={task} now={data.now} compact busy={actions.busyId === task.id} onComplete={actions.complete} />
                  ))}
                </ul>
              </section>
            );
          })
        )}
    </>
  );
}
