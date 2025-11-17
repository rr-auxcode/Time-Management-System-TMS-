import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import './ProjectForm.css';

interface ProjectFormProps {
  project?: Project | null;
  onSubmit: (project: Omit<Project, 'id' | 'tasks'>) => void;
  onCancel: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'cancelled' | 'on-hold'>('active');
  const [color, setColor] = useState('#f97316');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setStartDate(project.startDate.toISOString().split('T')[0]);
      setEndDate(project.endDate.toISOString().split('T')[0]);
      setStatus(project.status);
      setColor(project.color || '#f97316');
    } else {
      // Default to today and 30 days from now
      const today = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 30);
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(future.toISOString().split('T')[0]);
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
      color,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="project-form">
      <div className="form-group">
        <label htmlFor="name">Project Name *</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Enter project name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter project description"
          rows={3}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startDate">Start Date *</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="endDate">End Date *</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Project['status'])}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="color">Color</label>
          <div className="color-input-group">
            <input
              id="color"
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
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {project ? 'Update' : 'Create'} Project
        </button>
      </div>
    </form>
  );
};

