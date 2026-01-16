import React, { useState } from 'react';
import { DatePicker } from '../DatePicker/DatePicker';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import './VacationRequestForm.css';

interface VacationRequestFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const VacationRequestForm: React.FC<VacationRequestFormProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  React.useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(formatDate(today));
    setEndDate(formatDate(tomorrow));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be logged in to request vacation');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      setError('Start date must be before end date');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      const { error: insertError } = await supabase
        .from('vacation_requests')
        .insert({
          user_id: authUser.id,
          user_email: user.email,
          start_date: formatDate(start),
          end_date: formatDate(end),
          notes: notes.trim() || null,
          status: 'pending',
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting vacation request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit vacation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="vacation-request-form-container">
      <h2>Request Vacation</h2>
      {error && (
        <div className="error-message" style={{ 
          padding: '0.75rem', 
          background: '#fee2e2', 
          color: '#991b1b', 
          borderRadius: '6px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <DatePicker
            id="startDate"
            label="Start Date"
            value={startDate}
            onChange={(date) => setStartDate(date)}
            max={endDate}
            includeTime={false}
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
            includeTime={false}
            required
            placeholder="Select end date"
            locale={navigator.language || 'en-US'}
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes (Optional)</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional information about your vacation request"
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};
