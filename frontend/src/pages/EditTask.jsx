import { useNavigate, useParams } from 'react-router-dom';
import TaskForm from '../components/TaskForm.jsx';
import { ErrorState, PageLoader } from '../components/Feedback.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../context/ToastContext.jsx';
import { tasksApi } from '../api/endpoints.js';
import { toInputValue } from '../utils/dates.js';

export default function EditTask() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { data: task, loading, error, reload } = useFetch(() => tasksApi.get(id), [id]);

  if (loading && !task) return <PageLoader label="Loading task" />;
  if (error && !task) return <ErrorState message={error} onRetry={reload} />;

  const handleUpdate = async (payload) => {
    await tasksApi.update(id, payload);
    notify('Task updated');
    navigate('/tasks');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Edit task</h1>
          <p className="muted">Changes are saved to your list straight away.</p>
        </div>
      </div>
      <div className="narrow">
        <TaskForm
          submitLabel="Save changes"
          onSubmit={handleUpdate}
          initialValues={{
            title: task.title, description: task.description, category: task.category,
            priority: task.priority, status: task.status, dueDate: toInputValue(task.dueDate),
          }}
        />
      </div>
    </>
  );
}
