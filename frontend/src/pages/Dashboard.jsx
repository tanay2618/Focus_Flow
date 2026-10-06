import { Link } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import TaskItem from '../components/TaskItem.jsx';
import TaskCalendar from '../components/TaskCalendar.jsx';
import { EmptyState, ErrorState, LinkButton, PageLoader } from '../components/Feedback.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useTaskActions } from '../hooks/useTaskActions.js';
import { tasksApi } from '../api/endpoints.js';
import { addDays, greeting } from '../utils/dates.js';
import { countDueWithin } from '../utils/tasks.js';

function StatCard({ label, value, hint, tone }) {
  return (
    <div className={`stat${tone ? ` stat--${tone}` : ''}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      <span className="stat__hint">{hint}</span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(async () => {
    const now = new Date();
    const [stats, upcoming, allTasks] = await Promise.all([
      tasksApi.stats(),
      tasksApi.list({
        status: 'pending,in_progress',
        dueFrom: now.toISOString(),
        dueTo: addDays(now, 7).toISOString(),
        sort: 'dueDate',
      }),
      // The calendar also needs past, completed and later-month tasks, which the "Do soon" query
      // above intentionally leaves out. Same existing endpoint, no new route.
      tasksApi.list({ sort: 'dueDate' }),
    ]);
    return { stats, upcoming, allTasks, now };
  }, []);
  const actions = useTaskActions(reload);

  if (loading && !data) return <PageLoader label="Loading your dashboard" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const { stats, upcoming, allTasks, now } = data;
  const dueSoon = countDueWithin(upcoming, 48, now);
  const firstName = user?.name?.split(' ')[0];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greeting(now)}, {firstName}</h1>
          <p className="muted">Here is where your deadlines stand.</p>
        </div>
        <LinkButton to="/tasks/new">Add task</LinkButton>
      </div>

      {dueSoon >= 3 && (
        <Alert type="warning" title="Busy stretch ahead"
          actions={<Link to="/today" className="btn btn--sm btn--ghost">Plan today</Link>}>
          {dueSoon} unfinished tasks are due within the next 48 hours.
        </Alert>
      )}

      <section className="stats" aria-label="Task summary">
        <StatCard label="Total tasks" value={stats.total} hint="Across everything you track" />
        <StatCard label="Pending" value={stats.pending} hint="Not completed yet" />
        <StatCard label="Completed" value={stats.completed} hint="Done and dusted" tone="done" />
        <StatCard label="Overdue" value={stats.overdue} tone={stats.overdue > 0 ? 'overdue' : undefined}
          hint={stats.overdue > 0 ? 'Past due and unfinished' : 'Nothing past due'} />
      </section>

      <section aria-labelledby="soon-heading" className="section">
        <div className="section__head">
          <h2 id="soon-heading">Do soon</h2>
          <span className="muted">Next 7 days</span>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState title="Nothing due in the next 7 days"
            description="Add a task to start planning your week."
            action={<LinkButton to="/tasks/new">Add task</LinkButton>} />
        ) : (
          <ul className="task-list">
            {upcoming.map((task) => (
              <TaskItem key={task.id} task={task} now={now} compact busy={actions.busyId === task.id} onComplete={actions.complete} />
            ))}
          </ul>
        )}
      </section>

      <TaskCalendar tasks={allTasks} now={now} />
    </>
  );
}
