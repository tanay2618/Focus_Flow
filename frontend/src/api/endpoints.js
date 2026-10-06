import { api } from './client.js';

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const authApi = {
  signUp: (body) => api.post('/auth/signup', body).then((r) => r.data),
  signIn: (body) => api.post('/auth/signin', body).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const tasksApi = {
  list: (params) => api.get('/tasks', { params: clean(params) }).then((r) => r.data.tasks),
  stats: () => api.get('/tasks/stats').then((r) => r.data.stats),
  get: (id) => api.get(`/tasks/${id}`).then((r) => r.data.task),
  create: (body) => api.post('/tasks', body).then((r) => r.data.task),
  update: (id, body) => api.put(`/tasks/${id}`, body).then((r) => r.data.task),
  complete: (id) => api.patch(`/tasks/${id}/complete`).then((r) => r.data.task),
  remove: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
};
