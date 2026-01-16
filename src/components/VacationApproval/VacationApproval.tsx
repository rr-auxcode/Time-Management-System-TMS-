import React, { useState, useEffect } from 'react';
import { VacationRequest } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import './VacationApproval.css';

interface VacationApprovalProps {
  onClose: () => void;
  onUpdate: () => void;
}

export const VacationApproval: React.FC<VacationApprovalProps> = ({ onClose, onUpdate }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('vacation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading vacation requests:', error);
        return;
      }

      if (data) {
        const formattedRequests: VacationRequest[] = data.map((req: any) => ({
          id: req.id,
          user_id: req.user_id,
          user_email: req.user_email,
          start_date: new Date(req.start_date),
          end_date: new Date(req.end_date),
          status: req.status,
          approved_by: req.approved_by || undefined,
          approved_at: req.approved_at ? new Date(req.approved_at) : undefined,
          notes: req.notes || undefined,
          created_at: new Date(req.created_at),
          updated_at: new Date(req.updated_at),
        }));
        setRequests(formattedRequests);
      }
    } catch (error) {
      console.error('Error loading vacation requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('vacation_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error approving request:', error);
        alert('Failed to approve vacation request');
        return;
      }

      await loadRequests();
      onUpdate();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve vacation request');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('vacation_requests')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error rejecting request:', error);
        alert('Failed to reject vacation request');
        return;
      }

      await loadRequests();
      onUpdate();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject vacation request');
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDaysBetween = (start: Date, end: Date): number => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: { background: '#fef3c7', color: '#92400e' },
      approved: { background: '#d1fae5', color: '#065f46' },
      rejected: { background: '#fee2e2', color: '#991b1b' },
    };
    const style = styles[status as keyof typeof styles] || styles.pending;
    return (
      <span style={{
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 600,
        ...style
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="vacation-approval-container">
      <div className="vacation-approval-header">
        <h2>Vacation Requests</h2>
        {pendingCount > 0 && (
          <span className="pending-badge">{pendingCount} pending</span>
        )}
      </div>

      <div className="filter-buttons">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pending ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button
          className={filter === 'approved' ? 'active' : ''}
          onClick={() => setFilter('approved')}
        >
          Approved
        </button>
        <button
          className={filter === 'rejected' ? 'active' : ''}
          onClick={() => setFilter('rejected')}
        >
          Rejected
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          Loading vacation requests...
        </div>
      ) : requests.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          No vacation requests found.
        </div>
      ) : (
        <div className="vacation-requests-list">
          {requests.map((request) => (
            <div key={request.id} className="vacation-request-item">
              <div className="request-info">
                <div className="request-header">
                  <span className="user-email">{request.user_email}</span>
                  {getStatusBadge(request.status)}
                </div>
                <div className="request-dates">
                  {formatDate(request.start_date)} - {formatDate(request.end_date)}
                  <span className="days-count">({getDaysBetween(request.start_date, request.end_date)} days)</span>
                </div>
                {request.notes && (
                  <div className="request-notes">{request.notes}</div>
                )}
                {request.approved_at && (
                  <div className="request-meta">
                    {request.status === 'approved' ? 'Approved' : 'Rejected'} on {formatDate(request.approved_at)}
                  </div>
                )}
              </div>
              {request.status === 'pending' && (
                <div className="request-actions">
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(request.id)}
                  >
                    Reject
                  </button>
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(request.id)}
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="vacation-approval-footer">
        <button className="btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};
