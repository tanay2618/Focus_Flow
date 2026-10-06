export const TOKEN_KEY = 'focusflow.token';

export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];
export const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];
export const CATEGORIES = ['Assignment', 'Exam', 'Project', 'Lab', 'Reading', 'Personal', 'Other'];

export const PRIORITY_RANK = { low: 1, medium: 2, high: 3, urgent: 4 };
export const labelFor = (list, value) => list.find((i) => i.value === value)?.label ?? value;
