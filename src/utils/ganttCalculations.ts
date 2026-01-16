import { Task, TimelineView } from '../types';

export interface GanttBarPosition {
  task: Task;
  x: number;
  width: number;
  y: number;
  height: number;
}

export const calculateTimelineRange = (view: TimelineView): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

export const getWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const getDaysBetween = (start: Date, end: Date): number => {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getPixelsPerDay = (containerWidth: number, days: number): number => {
  return containerWidth / Math.max(days, 1);
};

export const calculateTaskPosition = (
  task: Task,
  timelineStart: Date,
  timelineEnd: Date,
  pixelsPerDay: number,
  rowIndex: number,
  rowHeight: number = 60
): GanttBarPosition | null => {
  let effectiveEndDate: Date;
  if (task.endDate) {
    effectiveEndDate = task.endDate;
  } else {
    const defaultDays = task.estimatedHours 
      ? Math.ceil(task.estimatedHours / 8)
      : 7;
    effectiveEndDate = new Date(task.startDate);
    effectiveEndDate.setDate(effectiveEndDate.getDate() + defaultDays);
  }

  const taskStart = task.startDate > timelineStart ? task.startDate : timelineStart;
  const taskEnd = effectiveEndDate < timelineEnd ? effectiveEndDate : timelineEnd;

  if (effectiveEndDate < timelineStart || task.startDate > timelineEnd) {
    return null;
  }

  const daysFromStart = getDaysBetween(timelineStart, taskStart);
  const taskDuration = getDaysBetween(taskStart, taskEnd);

  const x = daysFromStart * pixelsPerDay;
  const width = Math.max(taskDuration * pixelsPerDay, 50);

  return {
    task,
    x,
    width,
    y: rowIndex * rowHeight,
    height: rowHeight - 10,
  };
};

export const generateTimelineHeaders = (view: TimelineView, containerWidth: number): Array<{ date: Date; label: string; x: number; width: number }> => {
  const { start, end } = calculateTimelineRange(view);
  const days = getDaysBetween(start, end);
  const pixelsPerDay = getPixelsPerDay(containerWidth, days);
  const headers: Array<{ date: Date; label: string; x: number; width: number }> = [];

  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const dayDate = new Date(current);
    dayDate.setDate(start.getDate() + i);
    
    const dayNumber = dayDate.getDate();
    
    headers.push({
      date: new Date(dayDate),
      label: `${dayNumber}`,
      x: i * pixelsPerDay,
      width: pixelsPerDay,
    });
  }

  return headers;
};

