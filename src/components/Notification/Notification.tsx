import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PersonHoursReport } from '../../utils/hoursReport';
import { ReportNotification } from '../ReportNotification/ReportNotification';
import './Notification.css';

interface Report {
  id: string;
  user_id: string;
  recipient_email: string;
  recipient_name: string | null;
  report_data: PersonHoursReport;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export const Notification: React.FC = () => {
  const [notifications, setNotifications] = useState<Report[]>([]);
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const currentUserEmail = user?.email;
    if (!currentUserEmail) return;

    // Load pending reports for the current user
    const loadNotifications = async () => {
      // Use RPC or direct query - RLS will handle filtering by email
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      // Filter by email on client side as additional check
      // RLS policy should already filter, but we add this for safety
      const filteredData = data?.filter((report: any) => 
        report.recipient_email?.toLowerCase() === currentUserEmail.toLowerCase()
      );

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      // Use filtered data if available, otherwise use original data (RLS should handle it)
      const reportsToProcess = filteredData || data || [];

      if (reportsToProcess.length > 0) {
        // Deserialize report_data, converting ISO date strings back to Date objects
        setNotifications(reportsToProcess.map((report: any) => {
          const reportData = report.report_data as any;
          const deserializedReport: PersonHoursReport = {
            email: reportData.email,
            name: reportData.name,
            totalHours: reportData.totalHours,
            taskCount: reportData.taskCount,
            tasks: reportData.tasks.map((task: any) => ({
              taskName: task.taskName,
              projectName: task.projectName,
              hours: task.hours,
              timeEntries: task.timeEntries.map((entry: any) => ({
                date: entry.date instanceof Date 
                  ? entry.date 
                  : (typeof entry.date === 'string' ? new Date(entry.date) : new Date(entry.date)),
                hours: entry.hours,
              })),
            })),
          };

          return {
            ...report,
            report_data: deserializedReport,
          };
        }));
      }
    };

    loadNotifications();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`reports-channel-${currentUserEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports',
          filter: `recipient_email=eq.${currentUserEmail}`,
        },
        (payload) => {
          const newReport = payload.new as any;
          if (newReport.status === 'pending') {
            // Deserialize report_data, converting ISO date strings back to Date objects
            const reportData = newReport.report_data as any;
            const deserializedReport: PersonHoursReport = {
              email: reportData.email,
              name: reportData.name,
              totalHours: reportData.totalHours,
              taskCount: reportData.taskCount,
              tasks: reportData.tasks.map((task: any) => ({
                taskName: task.taskName,
                projectName: task.projectName,
                hours: task.hours,
                timeEntries: task.timeEntries.map((entry: any) => ({
                  date: entry.date instanceof Date 
                    ? entry.date 
                    : (typeof entry.date === 'string' ? new Date(entry.date) : new Date(entry.date)),
                  hours: entry.hours,
                })),
              })),
            };

            setNotifications((prev) => [
              {
                ...newReport,
                report_data: deserializedReport,
              },
              ...prev,
            ]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: `recipient_email=eq.${currentUserEmail}`,
        },
        (payload) => {
          const updatedReport = payload.new as any;
          // Deserialize report_data if it exists
          let deserializedReportData: PersonHoursReport | undefined;
          if (updatedReport.report_data) {
            const reportData = updatedReport.report_data as any;
            deserializedReportData = {
              email: reportData.email,
              name: reportData.name,
              totalHours: reportData.totalHours,
              taskCount: reportData.taskCount,
              tasks: reportData.tasks.map((task: any) => ({
                taskName: task.taskName,
                projectName: task.projectName,
                hours: task.hours,
                timeEntries: task.timeEntries.map((entry: any) => ({
                  date: entry.date instanceof Date 
                    ? entry.date 
                    : (typeof entry.date === 'string' ? new Date(entry.date) : new Date(entry.date)),
                  hours: entry.hours,
                })),
              })),
            };
          }

          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updatedReport.id
                ? {
                    ...n,
                    ...updatedReport,
                    report_data: deserializedReportData || n.report_data,
                  }
                : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  const handleCloseNotification = async (reportId: string) => {
    // Remove notification from local state (don't delete from DB, just hide)
    setNotifications((prev) => prev.filter((n) => n.id !== reportId));
    if (expandedNotification === reportId) {
      setExpandedNotification(null);
    }
  };

  const handleApprove = async (reportId: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const { error } = await supabase
      .from('reports')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: currentUser.id,
      })
      .eq('id', reportId);

    if (error) {
      console.error('Error approving report:', error);
      alert('Failed to approve report. Please try again.');
      return;
    }

    // Update local state
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === reportId
          ? {
              ...n,
              status: 'approved' as const,
              approved_at: new Date().toISOString(),
              approved_by: currentUser.id,
            }
          : n
      )
    );

    // Close the expanded notification
    setExpandedNotification(null);
  };

  const handleReject = async (reportId: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const { error } = await supabase
      .from('reports')
      .update({
        status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: currentUser.id,
      })
      .eq('id', reportId);

    if (error) {
      console.error('Error rejecting report:', error);
      alert('Failed to reject report. Please try again.');
      return;
    }

    // Update local state
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === reportId
          ? {
              ...n,
              status: 'rejected' as const,
              approved_at: new Date().toISOString(),
              approved_by: currentUser.id,
            }
          : n
      )
    );

    // Close the expanded notification
    setExpandedNotification(null);
  };

  // Only show pending notifications
  const pendingNotifications = notifications.filter((n) => n.status === 'pending');

  if (pendingNotifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {pendingNotifications.map((notification) => (
        <div key={notification.id} className="notification-popup">
          <div
            className="notification-header"
            onClick={() =>
              setExpandedNotification(
                expandedNotification === notification.id ? null : notification.id
              )
            }
          >
            <div className="notification-title">
              <span className="notification-icon">📊</span>
              <span>Hours Report</span>
            </div>
            <button
              className="notification-close"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseNotification(notification.id);
              }}
            >
              ×
            </button>
          </div>
          {expandedNotification === notification.id && (
            <div className="notification-content">
              <ReportNotification
                report={notification.report_data}
                onApprove={() => handleApprove(notification.id)}
                onReject={() => handleReject(notification.id)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

