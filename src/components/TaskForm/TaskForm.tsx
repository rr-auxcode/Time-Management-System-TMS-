import React, { useState, useEffect } from 'react';
import { Task, Project, TimeEntry } from '../../types';
import { DatePicker } from '../DatePicker/DatePicker';
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
  const [hasEndDate, setHasEndDate] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<'not-started' | 'in-progress' | 'completed' | 'on-hold'>('not-started');
  const [assignee, setAssignee] = useState('');
  const [color, setColor] = useState(project.color || '#f97316');
  const [timeEntries, setTimeEntries] = useState<Omit<TimeEntry, 'id' | 'taskId'>[]>([]);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || '');
      setStartDate(task.startDate.toISOString().split('T')[0]);
      if (task.endDate) {
        setEndDate(task.endDate.toISOString().split('T')[0]);
        setHasEndDate(true);
      } else {
        setEndDate('');
        setHasEndDate(false);
      }
      setEstimatedHours(task.estimatedHours);
      setStatus(task.status);
      setAssignee(task.assignee || '');
      setColor(task.color || project.color || '#f97316');
      // Load time entries, converting to form format
      setTimeEntries(
        (task.timeEntries || []).map(entry => ({
          date: entry.date,
          hours: entry.hours,
          notes: entry.notes,
        }))
      );
    } else {
      // Default to project start date
      setStartDate(project.startDate.toISOString().split('T')[0]);
      setEndDate('');
      setHasEndDate(false);
      setColor(project.color || '#f97316');
      setEstimatedHours(undefined);
      setTimeEntries([]);
    }
  }, [task, project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert YYYY-MM-DD strings to Date objects (local time, not UTC)
    const startDateObj = startDate ? new Date(startDate + 'T00:00:00') : new Date();
    const endDateObj = hasEndDate && endDate ? new Date(endDate + 'T00:00:00') : undefined;
    
    onSubmit({
      name,
      description,
      startDate: startDateObj,
      endDate: endDateObj,
      estimatedHours: estimatedHours || undefined,
      status,
      assignee: assignee.trim() || undefined,
      projectId: project.id,
      color,
      timeEntries: timeEntries.map(entry => ({
        ...entry,
        id: '', // Will be generated on the backend
        taskId: '', // Will be set when task is created
        date: entry.date instanceof Date ? entry.date : new Date(entry.date + 'T00:00:00'),
      })) as TimeEntry[],
    });
  };

  const addTimeEntry = () => {
    setTimeEntries([
      ...timeEntries,
      {
        date: new Date(),
        hours: 0,
        notes: '',
      },
    ]);
  };

  const updateTimeEntry = (index: number, updates: Partial<Omit<TimeEntry, 'id' | 'taskId'>>) => {
    const updated = [...timeEntries];
    updated[index] = { ...updated[index], ...updates };
    setTimeEntries(updated);
  };

  const removeTimeEntry = (index: number) => {
    setTimeEntries(timeEntries.filter((_, i) => i !== index));
  };

  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);

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
          <DatePicker
            id="task-startDate"
            label="Start Date"
            value={startDate}
            onChange={(date) => setStartDate(date)}
            required
            placeholder="Select start date"
            locale={navigator.language || 'en-US'}
          />
        </div>

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
      </div>

      <div className="form-row">
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="checkbox"
              id="task-has-end-date"
              checked={hasEndDate}
              onChange={(e) => {
                setHasEndDate(e.target.checked);
                if (!e.target.checked) {
                  setEndDate('');
                }
              }}
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            <label htmlFor="task-has-end-date" style={{ margin: 0, cursor: 'pointer', fontWeight: 500 }}>
              End Date (Optional)
            </label>
          </div>
          {hasEndDate ? (
            <DatePicker
              id="task-endDate"
              value={endDate}
              onChange={(date) => setEndDate(date)}
              min={startDate}
              placeholder="Select end date"
              locale={navigator.language || 'en-US'}
            />
          ) : (
            <div style={{ 
              padding: '0.75rem', 
              background: '#f9fafb', 
              border: '1px solid #e5e7eb', 
              borderRadius: '6px',
              color: '#6b7280',
              fontSize: '0.875rem',
              fontStyle: 'italic'
            }}>
              No end date
            </div>
          )}
        </div>

        <div className="form-group">
          {/* Empty space for alignment */}
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

      {/* Time Entries Section */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label>Time Entries</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f97316' }}>
              Total: {totalHours}h
            </span>
            <button
              type="button"
              onClick={addTimeEntry}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              + Add Entry
            </button>
          </div>
        </div>

        {timeEntries.length === 0 ? (
          <div style={{ 
            padding: '1.5rem', 
            textAlign: 'center', 
            background: '#f9fafb', 
            border: '1px dashed #d1d5db', 
            borderRadius: '6px',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            No time entries yet. Click "Add Entry" to log hours worked on this task.
          </div>
        ) : (
          <div className="time-entries-list">
            {timeEntries.map((entry, index) => (
              <div key={index} className="time-entry-item">
                <div className="form-row" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <DatePicker
                      value={entry.date instanceof Date ? entry.date.toISOString().split('T')[0] : new Date(entry.date).toISOString().split('T')[0]}
                      onChange={(dateString) => updateTimeEntry(index, { date: new Date(dateString) })}
                      required
                      placeholder="Select date"
                      locale={navigator.language || 'en-US'}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={entry.hours}
                      onChange={(e) => updateTimeEntry(index, { hours: Number(e.target.value) })}
                      required
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Notes (optional)</label>
                    <input
                      type="text"
                      value={entry.notes || ''}
                      onChange={(e) => updateTimeEntry(index, { notes: e.target.value })}
                      placeholder="What did you work on?"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => removeTimeEntry(index)}
                      className="btn-secondary"
                      style={{ 
                        padding: '0.5rem 0.75rem', 
                        fontSize: '1rem',
                        minWidth: 'auto',
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca'
                      }}
                      title="Remove entry"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
