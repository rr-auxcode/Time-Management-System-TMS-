import { Task } from '../types';

/**
 * Sort tasks handling optional end dates
 * Tasks without end dates are sorted to appear after tasks with end dates
 * within the same sort order
 */
export const sortTasksByDate = (
  tasks: Task[],
  ascending: boolean = true
): Task[] => {
  return [...tasks].sort((a, b) => {
    // Tasks with end dates come first (or last if descending)
    const aHasEndDate = a.endDate !== undefined;
    const bHasEndDate = b.endDate !== undefined;

    if (aHasEndDate && !bHasEndDate) {
      return ascending ? -1 : 1;
    }
    if (!aHasEndDate && bHasEndDate) {
      return ascending ? 1 : -1;
    }

    // Both have end dates or both don't - compare by start date
    const aDate = aHasEndDate ? a.endDate! : a.startDate;
    const bDate = bHasEndDate ? b.endDate! : b.startDate;

    if (aDate < bDate) {
      return ascending ? -1 : 1;
    }
    if (aDate > bDate) {
      return ascending ? 1 : -1;
    }

    // Same date, sort by start date
    if (a.startDate < b.startDate) {
      return ascending ? -1 : 1;
    }
    if (a.startDate > b.startDate) {
      return ascending ? 1 : -1;
    }

    return 0;
  });
};

/**
 * Sort tasks by start date only (ignoring end dates)
 */
export const sortTasksByStartDate = (
  tasks: Task[],
  ascending: boolean = true
): Task[] => {
  return [...tasks].sort((a, b) => {
    if (a.startDate < b.startDate) {
      return ascending ? -1 : 1;
    }
    if (a.startDate > b.startDate) {
      return ascending ? 1 : -1;
    }
    return 0;
  });
};

/**
 * Sort tasks by total hours (from time entries)
 */
export const sortTasksByHours = (
  tasks: Task[],
  ascending: boolean = true
): Task[] => {
  return [...tasks].sort((a, b) => {
    const aHours = a.timeEntries 
      ? a.timeEntries.reduce((sum, entry) => sum + entry.hours, 0)
      : 0;
    const bHours = b.timeEntries
      ? b.timeEntries.reduce((sum, entry) => sum + entry.hours, 0)
      : 0;

    if (aHours < bHours) {
      return ascending ? -1 : 1;
    }
    if (aHours > bHours) {
      return ascending ? 1 : -1;
    }
    return 0;
  });
};

