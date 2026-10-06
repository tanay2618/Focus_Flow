import { useCallback, useState } from 'react';
import { tasksApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

/** Complete and delete (with confirmation) shared by the Dashboard, Today and All tasks pages. */
export function useTaskActions(reload) {
  const { notify } = useToast();
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const complete = useCallback(async (task) => {
    setBusyId(task.id);
    try {
      await tasksApi.complete(task.id);
      notify(`Completed "${task.title}"`);
      reload();
    } catch (err) {
      notify(getErrorMessage(err, 'Could not complete the task.'), 'error');
    } finally {
      setBusyId(null);
    }
  }, [notify, reload]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await tasksApi.remove(pendingDelete.id);
      notify(`Deleted "${pendingDelete.title}"`);
      setPendingDelete(null);
      reload();
    } catch (err) {
      notify(getErrorMessage(err, 'Could not delete the task.'), 'error');
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, notify, reload]);

  return {
    busyId, complete, pendingDelete, deleting, confirmDelete,
    requestDelete: setPendingDelete,
    cancelDelete: () => setPendingDelete(null),
  };
}
