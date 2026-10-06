import { PRIORITIES, STATUSES, labelFor } from '../utils/constants.js';

export function PriorityBadge({ priority }) {
  return <span className={`badge badge--p-${priority}`}>{labelFor(PRIORITIES, priority)}</span>;
}

export function StatusBadge({ status }) {
  return <span className={`badge badge--s-${status}`}>{labelFor(STATUSES, status)}</span>;
}

export function OverdueBadge() {
  return <span className="badge badge--overdue">Overdue</span>;
}
