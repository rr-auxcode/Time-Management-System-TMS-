// Core types for the Time Management System

export interface Task {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  hoursSpent: number; // Hours spent working on the task
  estimatedHours?: number; // Estimated total hours (optional)
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  assignee?: string;
  dependencies?: string[]; // Array of task IDs this task depends on
  projectId: string;
  color?: string;
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

