import { Task } from '../types';

export const sortTasksByDate = (
  tasks: Task[],
  ascending: boolean = true
): Task[] => {
  return [...tasks].sort((a, b) => {
    const aHasEndDate = a.endDate !== undefined;
    const bHasEndDate = b.endDate !== undefined;

    if (aHasEndDate && !bHasEndDate) {
      return ascending ? -1 : 1;
    }
    if (!aHasEndDate && bHasEndDate) {
      return ascending ? 1 : -1;
    }

    const aDate = aHasEndDate ? a.endDate! : a.startDate;
    const bDate = bHasEndDate ? b.endDate! : b.startDate;

    if (aDate < bDate) {
      return ascending ? -1 : 1;
    }
    if (aDate > bDate) {
      return ascending ? 1 : -1;
    }

    if (a.startDate < b.startDate) {
      return ascending ? -1 : 1;
    }
    if (a.startDate > b.startDate) {
      return ascending ? 1 : -1;
    }

    return 0;
  });
};

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

