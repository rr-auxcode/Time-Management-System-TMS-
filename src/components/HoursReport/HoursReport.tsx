import React, { useState } from 'react';
import { PersonHoursReport, formatReportHTML } from '../../utils/hoursReport';
import './HoursReport.css';

interface HoursReportProps {
  reports: PersonHoursReport[];
  onClose: () => void;
  onSendEmails: (reports: PersonHoursReport[]) => void;
}

export const HoursReport: React.FC<HoursReportProps> = ({ reports, onClose, onSendEmails }) => {
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set(reports.map(r => r.email)));

  const toggleReport = (email: string) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedReports(newSelected);
  };

  const handleSendAll = () => {
    const toSend = reports.filter(r => selectedReports.has(r.email));
    onSendEmails(toSend);
  };

  const handleViewReport = (report: PersonHoursReport) => {
    const html = formatReportHTML(report);
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const handleCopyReport = async (report: PersonHoursReport) => {
    const html = formatReportHTML(report);
    try {
      await navigator.clipboard.writeText(html);
      alert('Report HTML copied to clipboard! You can paste it into an email or HTML file.');
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = html;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Report HTML copied to clipboard!');
    }
  };

  const handleDownloadReport = (report: PersonHoursReport) => {
    const html = formatReportHTML(report);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hours-report-${report.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenMailto = (report: PersonHoursReport) => {
    const html = formatReportHTML(report);
    const plainText = `Hours Report for ${report.name}\n\nTotal Hours: ${report.totalHours}h\nNumber of Tasks: ${report.taskCount}\n\nSee attached HTML file for full details.`;
    
    const subject = encodeURIComponent(`Your Hours Report - ${report.totalHours}h`);
    const body = encodeURIComponent(plainText);
    window.location.href = `mailto:${report.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="hours-report-modal">
      <div className="hours-report-content">
        <div className="hours-report-header">
          <h2>Hours Reports</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="hours-report-body">
          <p className="report-description">
            Review and send hours reports to team members. Select the reports you want to send.
          </p>
          <div className="reports-list">
            {reports.map((report) => (
              <div
                key={report.email}
                className={`report-item ${selectedReports.has(report.email) ? 'selected' : ''}`}
                onClick={() => toggleReport(report.email)}
              >
                <input
                  type="checkbox"
                  checked={selectedReports.has(report.email)}
                  onChange={() => toggleReport(report.email)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="report-info">
                  <div className="report-name">{report.name}</div>
                  <div className="report-email">{report.email}</div>
                  <div className="report-hours">Total: {report.totalHours}h ({report.taskCount} tasks)</div>
                </div>
                <div className="report-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="view-report-btn"
                    onClick={() => handleViewReport(report)}
                    title="View report in new window"
                  >
                    👁️ View
                  </button>
                  <button 
                    className="copy-report-btn"
                    onClick={() => handleCopyReport(report)}
                    title="Copy report HTML to clipboard"
                  >
                    📋 Copy
                  </button>
                  <button 
                    className="download-report-btn"
                    onClick={() => handleDownloadReport(report)}
                    title="Download report as HTML file"
                  >
                    💾 Download
                  </button>
                  <button 
                    className="mailto-btn"
                    onClick={() => handleOpenMailto(report)}
                    title="Open email client to send report"
                  >
                    ✉️ Email
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hours-report-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSendAll}
            disabled={selectedReports.size === 0}
          >
            Send {selectedReports.size} Report{selectedReports.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

