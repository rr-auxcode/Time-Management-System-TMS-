export type UserRole = 'normal' | 'client' | 'super_admin';

export interface TimeEntry {
  id: string;
  taskId: string;
  date: Date;
  hours: number;
  notes?: string;
  createdAt?: Date;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  estimatedHours?: number;
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  assignee?: string;
  dependencies?: string[];
  projectId: string;
  color?: string;
  timeEntries?: TimeEntry[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'cancelled' | 'on-hold';
  tasks: Task[];
  color?: string;
}

export interface Resource {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
}

export interface TimelineView {
  type: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: Date;
  endDate: Date;
}

export interface GanttBar {
  task: Task;
  x: number;
  width: number;
  y: number;
  height: number;
}

