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
  let start: Date;
  let end: Date;

  switch (view.type) {
    case 'day':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      break;
    case 'week':
      start = getWeekStart(now);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
      break;
    default:
      start = view.startDate;
      end = view.endDate;
  }

  return { start, end };
};

export const getWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Monday
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
  // For tasks without an end date, calculate a default duration
  // Use estimated hours if available (assume 8 hours per day), or default to 7 days
  let effectiveEndDate: Date;
  if (task.endDate) {
    effectiveEndDate = task.endDate;
  } else {
    // Calculate end date based on estimated hours or default duration
    const defaultDays = task.estimatedHours 
      ? Math.ceil(task.estimatedHours / 8) // Assume 8 hours per day
      : 7; // Default to 7 days if no estimate
    effectiveEndDate = new Date(task.startDate);
    effectiveEndDate.setDate(effectiveEndDate.getDate() + defaultDays);
  }

  const taskStart = task.startDate > timelineStart ? task.startDate : timelineStart;
  const taskEnd = effectiveEndDate < timelineEnd ? effectiveEndDate : timelineEnd;

  // Check if task overlaps with timeline
  if (effectiveEndDate < timelineStart || task.startDate > timelineEnd) {
    return null;
  }

  const daysFromStart = getDaysBetween(timelineStart, taskStart);
  const taskDuration = getDaysBetween(taskStart, taskEnd);

  const x = daysFromStart * pixelsPerDay;
  const width = Math.max(taskDuration * pixelsPerDay, 50); // Minimum width of 50px

  return {
    task,
    x,
    width,
    y: rowIndex * rowHeight,
    height: rowHeight - 10, // 10px margin
  };
};

export const generateTimelineHeaders = (view: TimelineView, containerWidth: number): Array<{ date: Date; label: string; x: number; width: number }> => {
  const { start, end } = calculateTimelineRange(view);
  const days = getDaysBetween(start, end);
  const pixelsPerDay = getPixelsPerDay(containerWidth, days);
  const headers: Array<{ date: Date; label: string; x: number; width: number }> = [];

  const current = new Date(start);

  switch (view.type) {
    case 'day':
      // Show hours
      for (let i = 0; i < 24; i++) {
        headers.push({
          date: new Date(current),
          label: `${i}:00`,
          x: (i / 24) * containerWidth,
          width: containerWidth / 24,
        });
      }
      break;
    case 'week':
      // Show days
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(current);
        dayDate.setDate(start.getDate() + i);
        headers.push({
          date: new Date(dayDate),
          label: dayDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
          x: i * pixelsPerDay,
          width: pixelsPerDay,
        });
      }
      break;
    case 'month':
      // Show weeks
      const weeksInMonth = Math.ceil(days / 7);
      for (let i = 0; i < weeksInMonth; i++) {
        const weekStart = new Date(current);
        weekStart.setDate(start.getDate() + i * 7);
        headers.push({
          date: new Date(weekStart),
          label: `Week ${i + 1}`,
          x: i * (containerWidth / weeksInMonth),
          width: containerWidth / weeksInMonth,
        });
      }
      break;
    case 'quarter':
      // Show months
      for (let i = 0; i < 3; i++) {
        const monthDate = new Date(current);
        monthDate.setMonth(start.getMonth() + i);
        headers.push({
          date: new Date(monthDate),
          label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          x: i * (containerWidth / 3),
          width: containerWidth / 3,
        });
      }
      break;
    default:
      // Show days as default
      for (let i = 0; i < days; i++) {
        const dayDate = new Date(current);
        dayDate.setDate(start.getDate() + i);
        headers.push({
          date: new Date(dayDate),
          label: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          x: i * pixelsPerDay,
          width: pixelsPerDay,
        });
      }
  }

  return headers;
};

