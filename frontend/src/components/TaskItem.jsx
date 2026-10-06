import { Link } from 'react-router-dom';
import { PriorityBadge, StatusBadge, OverdueBadge } from './Badges.jsx';
import { describeDue, formatDate, formatTime } from '../utils/dates.js';

/**
 * One task row. The coloured left rail carries priority; action buttons only render when a
 * handler is supplied, so the same row works on the dashboard, Today and All tasks pages.
 */
export default function TaskItem({ task, now, compact = false, busy = false, onComplete, onDelete, showEdit = true }) {
  const completed = task.status === 'completed';
  const due = describeDue(task.dueDate, { now, completed });

  return (
    <li className={`task task--${task.priority}${completed ? ' task--done' : ''}`}>
      <div className="task__main">
        <h3 className="task__title">{task.title}</h3>
        {!compact && task.description && <p className="task__desc">{task.description}</p>}
        <div className="task__meta">
          <span className="chip">{task.category}</span>
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          {task.isOverdue && <OverdueBadge />}
        </div>
      </div>

      <div className="task__due">
        <span className={`due due--${due.tone}`}>{due.text}</span>
        <span className="due__abs">{formatDate(task.dueDate, now)}, {formatTime(task.dueDate)}</span>
      </div>

      <div className="task__actions">
        {onComplete && !completed && (
          <button type="button" className="btn btn--sm btn--soft" disabled={busy}
            onClick={() => onComplete(task)} aria-label={`Mark "${task.title}" as completed`}>Complete</button>
        )}
        {showEdit && (
          <Link to={`/tasks/${task.id}/edit`} className="btn btn--sm btn--ghost" aria-label={`Edit "${task.title}"`}>Edit</Link>
        )}
        {onDelete && (
          <button type="button" className="btn btn--sm btn--ghost btn--danger-text" disabled={busy}
            onClick={() => onDelete(task)} aria-label={`Delete "${task.title}"`}>Delete</button>
        )}
      </div>
    </li>
  );
}
