import React, { useState, useEffect } from 'react';
import { Task, Project } from '../../types';
import './TaskForm.css';

interface TaskFormProps {
  task?: Task | null;
  project: Project;
  onSubmit: (task: Omit<Task, 'id'>) => void;
  onCancel: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ task, project, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hoursSpent, setHoursSpent] = useState(0);
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<'not-started' | 'in-progress' | 'completed' | 'on-hold'>('not-started');
  const [assignee, setAssignee] = useState('');
  const [color, setColor] = useState(project.color || '#f97316');

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || '');
      setStartDate(task.startDate.toISOString().split('T')[0]);
      setEndDate(task.endDate.toISOString().split('T')[0]);
      setHoursSpent(task.hoursSpent);
      setEstimatedHours(task.estimatedHours);
      setStatus(task.status);
      setAssignee(task.assignee || '');
      setColor(task.color || project.color || '#f97316');
    } else {
      // Default to project dates
      setStartDate(project.startDate.toISOString().split('T')[0]);
      setEndDate(project.endDate.toISOString().split('T')[0]);
      setColor(project.color || '#f97316');
      setHoursSpent(0);
      setEstimatedHours(undefined);
    }
  }, [task, project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      hoursSpent,
      estimatedHours: estimatedHours || undefined,
      status,
      assignee: assignee.trim() || undefined,
      projectId: project.id,
      color,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <div className="form-group">
        <label htmlFor="task-name">Task Name *</label>
        <input
          id="task-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Enter task name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="task-description">Description</label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter task description"
          rows={3}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="task-startDate">Start Date *</label>
          <input
            id="task-startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="task-endDate">End Date *</label>
          <input
            id="task-endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="task-status">Status</label>
          <select
            id="task-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Task['status'])}
          >
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="task-hours-spent">Hours Spent *</label>
          <input
            id="task-hours-spent"
            type="number"
            min="0"
            step="0.25"
            value={hoursSpent}
            onChange={(e) => setHoursSpent(Number(e.target.value))}
            required
            placeholder="0"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="task-estimated-hours">Estimated Hours (optional)</label>
          <input
            id="task-estimated-hours"
            type="number"
            min="0"
            step="0.25"
            value={estimatedHours ?? ''}
            onChange={(e) => setEstimatedHours(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Enter estimated hours"
          />
        </div>

        <div className="form-group">
          <label htmlFor="task-assignee">Assignee Email *</label>
          <input
            id="task-assignee"
            type="email"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="name@example.com"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="task-color">Color</label>
        <div className="color-input-group">
          <input
            id="task-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
              placeholder="#f97316"
            pattern="^#[0-9A-Fa-f]{6}$"
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {task ? 'Update' : 'Create'} Task
        </button>
      </div>
    </form>
  );
};

