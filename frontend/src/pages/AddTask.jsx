import { useState } from 'react';
import { Link } from 'react-router-dom';
import TaskForm from '../components/TaskForm.jsx';
import Alert from '../components/Alert.jsx';
import { tasksApi } from '../api/endpoints.js';

export default function AddTask() {
  const [created, setCreated] = useState(null);
  const [formKey, setFormKey] = useState(0); // bumping the key resets the form for the next task

  const handleCreate = async (payload) => {
    setCreated(null);
    const task = await tasksApi.create(payload);
    setCreated(task);
    setFormKey((k) => k + 1);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Add task</h1>
          <p className="muted">Capture it now so it does not sneak up on you.</p>
        </div>
      </div>

      <div className="narrow">
        {created && (
          <Alert type="success" title="Task added"
            actions={<Link to="/tasks" className="btn btn--sm btn--ghost">View all tasks</Link>}>
            "{created.title}" is on your list. Add another below if you like.
          </Alert>
        )}
        <TaskForm key={formKey} submitLabel="Add task" onSubmit={handleCreate} />
      </div>
    </>
  );
}
