import { AppError } from '../utils/AppError.js';
import { parseTaskId, validateTask, validateListQuery } from '../utils/validators.js';
import { TaskModel, toTask } from '../models/task.model.js';

const getOwned = (req) => {
  const id = parseTaskId(req.params.id);
  const row = TaskModel.findOne(req.user.id, id);
  if (!row) throw new AppError(404, 'Task not found'); // same answer for "missing" and "not yours"
  return { id, row };
};

export function listTasks(req, res) {
  const filters = validateListQuery(req.query);
  const now = new Date();
  const tasks = TaskModel.list(req.user.id, filters, now).map((r) => toTask(r, now));
  res.json({ count: tasks.length, tasks });
}

export function getStats(req, res) {
  res.json({ stats: TaskModel.stats(req.user.id) });
}

export function getTask(req, res) {
  res.json({ task: toTask(getOwned(req).row) });
}

export function createTask(req, res) {
  const data = validateTask(req.body);
  res.status(201).json({ task: toTask(TaskModel.create(req.user.id, data)) });
}

export function updateTask(req, res) {
  const { id } = getOwned(req);
  const data = validateTask(req.body, { partial: true });
  res.json({ task: toTask(TaskModel.update(req.user.id, id, data)) });
}

export function completeTask(req, res) {
  const { id } = getOwned(req);
  res.json({ task: toTask(TaskModel.complete(req.user.id, id)) });
}

export function deleteTask(req, res) {
  const { id } = getOwned(req);
  TaskModel.remove(req.user.id, id);
  res.json({ message: 'Task deleted', id });
}
