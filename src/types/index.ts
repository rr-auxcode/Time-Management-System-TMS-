// Core types for the Time Management System

export interface TimeEntry {
  id: string;
  taskId: string;
  date: Date; // Date when work was done
  hours: number; // Hours worked on this date
  notes?: string; // Optional notes about what was done
  createdAt?: Date;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  startDate: Date; // When the task starts
  endDate?: Date; // Optional end date - tasks can have no end date
  estimatedHours?: number; // Estimated total hours (optional)
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  assignee?: string;
  dependencies?: string[]; // Array of task IDs this task depends on
  projectId: string;
  color?: string;
  timeEntries?: TimeEntry[]; // Time entries for this task
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
  x: number; // Position in pixels
  width: number; // Width in pixels
  y: number; // Row position
  height: number; // Row height
}

