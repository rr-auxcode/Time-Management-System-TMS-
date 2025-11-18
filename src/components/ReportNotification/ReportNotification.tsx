import React from 'react';
import { PersonHoursReport, formatReportHTML } from '../../utils/hoursReport';
import './ReportNotification.css';

interface ReportNotificationProps {
  report: PersonHoursReport;
  onApprove: () => void;
  onReject: () => void;
}

export const ReportNotification: React.FC<ReportNotificationProps> = ({
  report,
  onApprove,
  onReject,
}) => {
  const handleViewReport = () => {
    const html = formatReportHTML(report);
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  return (
    <div className="report-notification">
      <div className="report-notification-header">
        <div className="report-summary">
          <h3>{report.name}</h3>
          <p className="report-email">{report.email}</p>
          <div className="report-totals">
            <span className="total-hours">Total: {report.totalHours}h</span>
            <span className="task-count">{report.taskCount} task{report.taskCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
      
      <div className="report-notification-body">
        <div className="report-tasks">
          {report.tasks.map((task, index) => (
            <div key={index} className="report-task-item">
              <div className="task-header">
                <span className="task-name">{task.taskName}</span>
                <span className="task-hours">{task.hours}h</span>
              </div>
              <div className="task-project">{task.projectName}</div>
              <div className="task-time-entries">
                {task.timeEntries.map((entry, entryIndex) => (
                  <div key={entryIndex} className="time-entry">
                    <span className="entry-date">
                      {entry.date instanceof Date
                        ? entry.date.toLocaleDateString()
                        : new Date(entry.date).toLocaleDateString()}
                    </span>
                    <span className="entry-hours">{entry.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="report-notification-actions">
        <button
          className="btn-view-report"
          onClick={handleViewReport}
          title="View full report in new window"
        >
          👁️ View Full Report
        </button>
        <div className="approval-buttons">
          <button
            className="btn-reject"
            onClick={onReject}
            title="Reject this hours report"
          >
            Reject
          </button>
          <button
            className="btn-approve"
            onClick={onApprove}
            title="Approve this hours report"
          >
            ✓ Approve
          </button>
        </div>
      </div>
    </div>
  );
};

