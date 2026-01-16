import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { DatePicker } from '../DatePicker/DatePicker';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import './ProjectForm.css';

interface ProjectFormProps {
  project?: Project | null;
  onSubmit: (project: Omit<Project, 'id' | 'tasks'>, clientEmails?: string[]) => void;
  onCancel: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSubmit, onCancel }) => {
  const { isSuperAdmin } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'cancelled' | 'on-hold'>('active');
  const [color, setColor] = useState('#f97316');
  const [clientEmails, setClientEmails] = useState<string[]>([]);
  const [newClientEmail, setNewClientEmail] = useState('');

  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setStartDate(formatDateTime(project.startDate));
      setEndDate(formatDateTime(project.endDate));
      setStatus(project.status);
      setColor(project.color || '#f97316');
      
      if (isSuperAdmin) {
        loadClientAccess(project.id);
      }
    } else {
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 30);
      future.setHours(now.getHours(), 0, 0, 0);
      setStartDate(formatDateTime(now));
      setEndDate(formatDateTime(future));
      setClientEmails([]);
    }
  }, [project, isSuperAdmin]);

  const loadClientAccess = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_client_access')
        .select('client_email')
        .eq('project_id', projectId);
      
      if (error) {
        console.error('Error loading client access:', error);
        return;
      }
      
      if (data) {
        setClientEmails(data.map(item => item.client_email));
      }
    } catch (error) {
      console.error('Error loading client access:', error);
    }
  };

  const addClientEmail = () => {
    const email = newClientEmail.trim().toLowerCase();
    if (!email) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }
    
    if (clientEmails.includes(email)) {
      alert('This email is already added');
      return;
    }
    
    setClientEmails([...clientEmails, email]);
    setNewClientEmail('');
  };

  const removeClientEmail = (emailToRemove: string) => {
    setClientEmails(clientEmails.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addClientEmail();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parseDateTime = (dateTimeString: string): Date => {
      if (!dateTimeString) return new Date();
      if (dateTimeString.includes('T')) {
        const parts = dateTimeString.split('T');
        const timePart = parts[1] || '00:00';
        const timeParts = timePart.split(':');
        const seconds = timeParts.length >= 3 ? timeParts[2] : '00';
        return new Date(`${parts[0]}T${timeParts[0]}:${timeParts[1] || '00'}:${seconds}`);
      }
      return new Date(dateTimeString + 'T00:00:00');
    };

    const startDateObj = parseDateTime(startDate);
    const endDateObj = parseDateTime(endDate);
    
    onSubmit({
      name,
      description,
      startDate: startDateObj,
      endDate: endDateObj,
      status,
      color,
    }, isSuperAdmin ? clientEmails : undefined);
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
              <DatePicker
                id="startDate"
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                max={endDate}
                includeTime={true}
                timeLabel="Start Hour"
                required
                placeholder="Select start date"
                locale={navigator.language || 'en-US'}
              />
            </div>

            <div className="form-group">
              <DatePicker
                id="endDate"
                label="End Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                min={startDate}
                includeTime={true}
                timeLabel="End Hour"
                required
                placeholder="Select end date"
                locale={navigator.language || 'en-US'}
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

      {isSuperAdmin && (
        <div className="form-group">
          <label htmlFor="client-emails">Client Access</label>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Add client email addresses to grant them access to this project. Clients will only be able to view this project.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              id="client-emails"
              type="email"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="client@example.com"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={addClientEmail}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              Add
            </button>
          </div>
          {clientEmails.length > 0 && (
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.5rem',
              marginTop: '0.5rem',
              padding: '0.75rem',
              background: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              {clientEmails.map((email) => (
                <div
                  key={email}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.375rem 0.75rem',
                    background: 'white',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem'
                  }}
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => removeClientEmail(email)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '1.25rem',
                      lineHeight: 1,
                      padding: 0,
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remove client access"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

