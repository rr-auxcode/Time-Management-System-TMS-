import { useState } from 'react';
import { Header } from './components/Header/Header';
import { ProjectList } from './components/ProjectList/ProjectList';
import { GanttChart } from './components/GanttChart/GanttChart';
import { Modal } from './components/Modal/Modal';
import { ProjectForm } from './components/ProjectForm/ProjectForm';
import { TaskForm } from './components/TaskForm/TaskForm';
import { HoursReport } from './components/HoursReport/HoursReport';
import { Login } from './components/Login/Login';
import { Notification } from './components/Notification/Notification';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider, useProjects } from './context/ProjectContext';
import { Project, TimelineView, Task } from './types';
import { PersonHoursReport } from './utils/hoursReport';
import { generateHoursReports, formatReportHTML } from './utils/hoursReport';
import { supabase } from './lib/supabase';
import './App.css';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <MainApp />;
}

function MainApp() {
  const { isReportManager, isClient } = useAuth();
  const { projects, selectedProject, addProject, updateProject, addTask, updateTask, isLoading, error } = useProjects();
  const now = new Date();
  const [view] = useState<TimelineView>({
    type: 'month',
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  });
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [hoursReports, setHoursReports] = useState<PersonHoursReport[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const displayProjects = selectedProject ? [selectedProject] : projects;

  const handleNewProject = () => {
    if (isClient) {
      alert('Clients cannot create projects. Please contact an administrator.');
      return;
    }
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    if (isClient) {
      alert('Clients cannot edit projects. Please contact an administrator.');
      return;
    }
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleProjectSubmit = async (projectData: Omit<Project, 'id' | 'tasks'>) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, projectData);
      } else {
        await addProject(projectData);
      }
      setIsProjectModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Error saving project:', error);
      alert(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleNewTask = () => {
    if (isClient) {
      alert('Clients cannot create tasks. Please contact an administrator.');
      return;
    }
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    if (isClient) {
      return;
    }
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (taskData: Omit<Task, 'id'>) => {
    if (!selectedProject) return;

    try {
      if (editingTask) {
        await updateTask(selectedProject.id, editingTask.id, taskData);
      } else {
        await addTask(selectedProject.id, taskData);
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
      alert(`Failed to save task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleGenerateHoursReport = async () => {
    if (!isReportManager) {
      alert('You do not have permission to generate reports. Only the report manager can create and send reports.');
      return;
    }

    const reports = generateHoursReports(projects);
    if (reports.length === 0) {
      const tasksWithAssignees = projects.flatMap(p => p.tasks).filter(t => t.assignee && t.assignee.trim() !== '');
      const tasksWithTimeEntries = projects.flatMap(p => p.tasks).filter(t => {
        const entries = t.timeEntries || [];
        const totalHours = entries.reduce((sum, entry) => sum + (typeof entry.hours === 'number' ? entry.hours : 0), 0);
        return totalHours > 0;
      });

      let message = 'No tasks with valid email assignees and time entries found.\n\n';
      
      if (tasksWithAssignees.length === 0) {
        message += '• No tasks have assignees. Please add email addresses to tasks.\n';
      } else {
        message += `• Found ${tasksWithAssignees.length} task(s) with assignees.\n`;
      }

      if (tasksWithTimeEntries.length === 0) {
        message += '• No tasks have time entries with hours > 0. Please add time entries to tasks.\n';
      } else {
        message += `• Found ${tasksWithTimeEntries.length} task(s) with time entries.\n`;
      }

      message += '\nCheck the browser console for detailed debug information.';

      alert(message);
      console.log('Projects:', projects);
      console.log('Tasks with assignees:', tasksWithAssignees);
      console.log('Tasks with time entries:', tasksWithTimeEntries);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to send reports.');
      return;
    }

    try {
      const reportsToInsert = reports.map((report) => {
        const serializedReport = {
          email: report.email,
          name: report.name,
          totalHours: report.totalHours,
          taskCount: report.taskCount,
          tasks: report.tasks.map(task => ({
            taskName: task.taskName,
            projectName: task.projectName,
            hours: task.hours,
            timeEntries: task.timeEntries.map(entry => ({
              date: entry.date instanceof Date 
                ? entry.date.toISOString() 
                : (typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString()),
              hours: entry.hours,
            })),
          })),
        };

        return {
          user_id: user.id,
          recipient_email: report.email,
          recipient_name: report.name,
          report_data: serializedReport,
          status: 'pending',
        };
      });

      const { data, error } = await supabase.from('reports').insert(reportsToInsert).select();

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }

      console.log('Successfully inserted reports:', data);

      alert(`Successfully sent ${reports.length} report${reports.length > 1 ? 's' : ''} to users. They will receive notifications in their app.`);
      
      setHoursReports(reports);
      setIsReportModalOpen(true);
    } catch (error) {
      console.error('Error sending reports:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'object' && error !== null && 'message' in error 
          ? String(error.message) 
          : 'Unknown error');
      alert(`Failed to send reports: ${errorMessage}\n\nCheck the browser console for more details.`);
    }
  };

  const handleSendEmails = async (reportsToSend: PersonHoursReport[]) => {
    if (!isReportManager) {
      alert('You do not have permission to send reports. Only the report manager can send reports.');
      return;
    }

    const emailjs = await import('@emailjs/browser');
    
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

    if (!serviceId || !templateId || !publicKey || serviceId === 'YOUR_SERVICE_ID') {
      alert('Email service not configured. Please set up EmailJS service ID, template ID, and public key in your .env file.');
      return;
    }

    emailjs.init(publicKey);

    let successCount = 0;
    let failCount = 0;
    const failedEmails: string[] = [];

    for (const report of reportsToSend) {
      try {
        const emailHtml = formatReportHTML(report);
        
        await emailjs.send(serviceId, templateId, {
          to_email: report.email,
          to_name: report.name,
          subject: `Your Hours Report - ${report.totalHours}h`,
          message: emailHtml,
          total_hours: report.totalHours.toString(),
          task_count: report.taskCount.toString(),
        });

        successCount++;
      } catch (error: any) {
        console.error(`Failed to send email to ${report.email}:`, error);
        failCount++;
        failedEmails.push(report.email);
        
        if (error?.text?.includes('insufficient authentication scopes') || error?.text?.includes('authentication scopes')) {
          alert(
            `Gmail API authentication error. Please:\n\n` +
            `1. Go to EmailJS dashboard (https://dashboard.emailjs.com/)\n` +
            `2. Navigate to "Email Services"\n` +
            `3. Click on your Gmail service\n` +
            `4. Click "Reconnect" and grant ALL permissions\n` +
            `5. Make sure to check "Send email" permission\n\n` +
            `Then try again.`
          );
          return;
        }
      }
    }

    if (successCount > 0) {
      alert(`Successfully sent ${successCount} report${successCount > 1 ? 's' : ''}!${failCount > 0 ? `\n\nFailed to send ${failCount} report${failCount > 1 ? 's' : ''} to: ${failedEmails.join(', ')}` : ''}`);
      setIsReportModalOpen(false);
    } else {
      alert(
        `Failed to send all reports.\n\n` +
        `Error: Gmail API authentication scopes issue.\n\n` +
        `To fix this:\n` +
        `1. Go to https://dashboard.emailjs.com/\n` +
        `2. Go to "Email Services"\n` +
        `3. Click on your Gmail service\n` +
        `4. Click "Reconnect" button\n` +
        `5. Grant ALL requested permissions (especially "Send email")\n` +
        `6. Save and try again\n\n` +
        `Alternatively, you can use the "View Report" button to see and copy the report manually.`
      );
    }
  };

  return (
    <div className="app">
      <Header />
      <Notification />
      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', textAlign: 'center' }}>
          Error: {error}
        </div>
      )}
      {isLoading && (
        <div style={{ padding: '1rem', background: '#fef3c7', color: '#92400e', textAlign: 'center' }}>
          Loading projects...
        </div>
      )}
      <div className="app-body">
        <ProjectList
          onNewProjectClick={handleNewProject}
          onEditProjectClick={handleEditProject}
        />
        <div className="main-content">
          <div className="view-controls">
            <div className="month-display" style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
              {new Date(view.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="action-buttons">
              {isReportManager && (
                <button className="summary-btn" onClick={handleGenerateHoursReport} title="Generate and send hours reports by email">
                  📊 Generate Reports
                </button>
              )}
              {selectedProject && !isClient && (
                <button className="add-task-btn" onClick={handleNewTask}>
                  + Add Task
                </button>
              )}
            </div>
          </div>
          <GanttChart
            projects={displayProjects}
            view={view}
            onTaskClick={handleTaskClick}
          />
        </div>
      </div>

      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        title={editingProject ? 'Edit Project' : 'New Project'}
      >
        <ProjectForm
          project={editingProject}
          onSubmit={handleProjectSubmit}
          onCancel={() => {
            setIsProjectModalOpen(false);
            setEditingProject(null);
          }}
        />
      </Modal>

      {selectedProject && (
        <Modal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          title={editingTask ? 'Edit Task' : 'New Task'}
        >
          <TaskForm
            task={editingTask}
            project={selectedProject}
            onSubmit={handleTaskSubmit}
            onCancel={() => {
              setIsTaskModalOpen(false);
              setEditingTask(null);
            }}
          />
        </Modal>
      )}

      {isReportModalOpen && (
        <HoursReport
          reports={hoursReports}
          onClose={() => setIsReportModalOpen(false)}
          onSendEmails={handleSendEmails}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;
