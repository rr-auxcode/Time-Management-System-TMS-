import { Project, Task } from '../types';

export interface AssigneeSummary {
  assignee: string;
  totalHours: number;
  tasks: Task[];
}

export const aggregateHoursByAssignee = (projects: Project[]): AssigneeSummary[] => {
  const assigneeMap = new Map<string, Task[]>();

  projects.forEach((project) => {
    project.tasks.forEach((task) => {
      if (task.assignee && task.assignee.trim() !== '') {
        const assignee = task.assignee.trim();
        if (!assigneeMap.has(assignee)) {
          assigneeMap.set(assignee, []);
        }
        assigneeMap.get(assignee)!.push(task);
      }
    });
  });

  const summaries: AssigneeSummary[] = Array.from(assigneeMap.entries()).map(([assignee, tasks]) => {
    const totalHours = tasks.reduce((sum, task) => sum + task.hoursSpent, 0);
    return {
      assignee,
      totalHours,
      tasks,
    };
  });

  return summaries.sort((a, b) => b.totalHours - a.totalHours);
};

export const createSummaryProjects = (projects: Project[]): Project[] => {
  const summaries = aggregateHoursByAssignee(projects);
  const now = new Date();

  return summaries.map((summary, index) => {
    const taskDates = summary.tasks.map((task) => ({
      start: task.startDate,
      end: task.endDate,
    }));

    const earliestStart = taskDates.reduce((earliest, current) =>
      current.start < earliest ? current.start : earliest
    , taskDates[0]?.start || now);

    const latestEnd = taskDates.reduce((latest, current) =>
      current.end > latest ? current.end : latest
    , taskDates[0]?.end || now);

    const projectId = `summary-${summary.assignee.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${index}`;

    const summaryTask: Task = {
      id: `${projectId}-task`,
      name: `Total Hours: ${summary.totalHours}h`,
      description: `Summary of all hours worked by ${summary.assignee} across ${summary.tasks.length} task${summary.tasks.length !== 1 ? 's' : ''}.`,
      startDate: earliestStart,
      endDate: latestEnd,
      hoursSpent: summary.totalHours,
      estimatedHours: summary.totalHours,
      status: 'completed',
      assignee: summary.assignee,
      projectId: projectId,
      color: '#f97316',
    };

    const summaryProject: Project = {
      id: projectId,
      name: `Hours Summary: ${summary.assignee}`,
      description: `Total hours: ${summary.totalHours}h. This is an auto-generated summary project.`,
      startDate: earliestStart,
      endDate: latestEnd,
      status: 'active',
      color: '#f97316',
      tasks: [summaryTask],
    };

    return summaryProject;
  });
};

