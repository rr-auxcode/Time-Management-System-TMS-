import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, Task,  TimeEntry } from '../types';
import { supabase } from '../lib/supabase';
import { migrateLocalStorageToSupabase, isMigrationComplete, hasLocalStorageData } from '../utils/dataMigration';

interface ProjectContextType {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  error: string | null;
  addProject: (project: Omit<Project, 'id' | 'tasks'>) => Promise<Project>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  selectProject: (project: Project | null) => void;
  addTask: (projectId: string, task: Omit<Task, 'id'>) => Promise<Task>;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'tms-projects';

// Helper to convert Supabase project to app Project type
function dbProjectToProject(dbProject: any, tasks: Task[]): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description || undefined,
    startDate: new Date(dbProject.start_date),
    endDate: new Date(dbProject.end_date),
    status: dbProject.status,
    color: dbProject.color || undefined,
    tasks: tasks,
  };
}

// Helper to convert Supabase task to app Task type
// Dates from Supabase are TIMESTAMPTZ, so they preserve date and time
function dbTaskToTask(dbTask: any, timeEntries: TimeEntry[] = []): Task {
  return {
    id: dbTask.id,
    projectId: dbTask.project_id,
    name: dbTask.name,
    description: dbTask.description || undefined,
    startDate: new Date(dbTask.start_date), // Preserves date and time from database
    endDate: dbTask.end_date ? new Date(dbTask.end_date) : undefined, // Preserves date and time
    estimatedHours: dbTask.estimated_hours ? Number(dbTask.estimated_hours) : undefined,
    status: dbTask.status,
    assignee: dbTask.assignee || undefined,
    color: dbTask.color || undefined,
    dependencies: dbTask.dependencies || undefined,
    timeEntries: timeEntries.length > 0 ? timeEntries : undefined,
  };
}

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useSupabase, setUseSupabase] = useState(true);

  // Load projects from Supabase or localStorage
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!user || authError) {
        // Fallback to localStorage if not authenticated
        console.warn('User not authenticated, using localStorage');
        loadFromLocalStorage();
        setUseSupabase(false);
        return;
      }

      // Check if we need to migrate from localStorage
      if (hasLocalStorageData() && !isMigrationComplete()) {
        console.log('Migrating data from localStorage to Supabase...');
        const migrationResult = await migrateLocalStorageToSupabase();
        if (migrationResult.success) {
          console.log(`Migration complete: ${migrationResult.projectsMigrated} projects, ${migrationResult.tasksMigrated} tasks migrated`);
        } else {
          console.warn('Migration failed:', migrationResult.error);
        }
      }

      // Load projects from Supabase
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) {
        throw projectsError;
      }

      if (!projectsData || projectsData.length === 0) {
        setProjects([]);
        setIsLoading(false);
        return;
      }

      // Load all tasks for all projects
      const projectIds = projectsData.map(p => p.id);
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('project_id', projectIds)
        .order('start_date', { ascending: true })
        .order('end_date', { ascending: true, nullsFirst: false }); // Sort by start date, then end date (tasks without end date come after)

      if (tasksError) {
        throw tasksError;
      }

      // Load all time entries for all tasks
      const taskIds = (tasksData || []).map((t: any) => t.id);
      const { data: timeEntriesData, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('*')
        .in('task_id', taskIds.length > 0 ? taskIds : ['00000000-0000-0000-0000-000000000000'])
        .order('date', { ascending: false });

      if (timeEntriesError) {
        console.warn('Error loading time entries:', timeEntriesError);
      }

      // Group time entries by task
      const timeEntriesByTask = new Map<string, TimeEntry[]>();
      (timeEntriesData || []).forEach((dbEntry: any) => {
        const entry: TimeEntry = {
          id: dbEntry.id,
          taskId: dbEntry.task_id,
          date: new Date(dbEntry.date),
          hours: Number(dbEntry.hours),
          notes: dbEntry.notes || undefined,
          createdAt: dbEntry.created_at ? new Date(dbEntry.created_at) : undefined,
        };
        if (!timeEntriesByTask.has(entry.taskId)) {
          timeEntriesByTask.set(entry.taskId, []);
        }
        timeEntriesByTask.get(entry.taskId)!.push(entry);
      });

      // Group tasks by project
      const tasksByProject = new Map<string, Task[]>();
      (tasksData || []).forEach((dbTask: any) => {
        const timeEntries = timeEntriesByTask.get(dbTask.id) || [];
        const task = dbTaskToTask(dbTask, timeEntries);
        if (!tasksByProject.has(task.projectId)) {
          tasksByProject.set(task.projectId, []);
        }
        tasksByProject.get(task.projectId)!.push(task);
      });

      // Convert to app format
      const loadedProjects = projectsData.map((dbProject: any) => {
        const tasks = tasksByProject.get(dbProject.id) || [];
        return dbProjectToProject(dbProject, tasks);
      });

      setProjects(loadedProjects);
      setUseSupabase(true);
    } catch (err) {
      console.error('Error loading projects from Supabase:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      // Fallback to localStorage
      loadFromLocalStorage();
      setUseSupabase(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fallback: Load from localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedProjects = JSON.parse(stored);
        const projectsWithDates = parsedProjects.map((project: any) => ({
          ...project,
          startDate: new Date(project.startDate),
          endDate: new Date(project.endDate),
          tasks: project.tasks.map((task: any) => ({
            ...task,
            startDate: new Date(task.startDate),
            endDate: task.endDate ? new Date(task.endDate) : undefined,
            estimatedHours: task.estimatedHours,
            timeEntries: (task.timeEntries || []).map((entry: any) => ({
              ...entry,
              date: new Date(entry.date),
              createdAt: entry.createdAt ? new Date(entry.createdAt) : undefined,
            })),
          })),
        }));
        setProjects(projectsWithDates);
      }
    } catch (error) {
      console.error('Error loading projects from localStorage:', error);
    }
  }, []);

  // Save to localStorage as backup
  const saveToLocalStorage = useCallback((projectsToSave: Project[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsToSave));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, []);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Save to localStorage whenever projects change (as backup)
  useEffect(() => {
    if (projects.length > 0) {
      saveToLocalStorage(projects);
    }
  }, [projects, saveToLocalStorage]);

  const addProject = useCallback(async (projectData: Omit<Project, 'id' | 'tasks'>): Promise<Project> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
      // Fallback to localStorage
      const newProject: Project = {
        ...projectData,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tasks: [],
      };
      setProjects((prev) => [...prev, newProject]);
      return newProject;
    }

    // Helper to convert Date to ISO string for storage (preserves date and time, handles timezone)
    // Converts local date/time to ISO string preserving the intended date/time values
    const dateToISO = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      // Store as local time converted to UTC (preserves the date/time user selected)
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
    };

    // Save to Supabase
    const { data: insertedProject, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectData.name,
        description: projectData.description || null,
        start_date: dateToISO(projectData.startDate),
        end_date: dateToISO(projectData.endDate),
        status: projectData.status,
        color: projectData.color || null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create project: ${insertError.message}`);
    }

    const newProject = dbProjectToProject(insertedProject, []);
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  }, [useSupabase]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
      // Fallback to localStorage
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id === projectId) {
            const updated = { ...project, ...updates };
            if (selectedProject?.id === projectId) {
              setSelectedProject(updated);
            }
            return updated;
          }
          return project;
        })
      );
      return;
    }

    // Helper to convert Date to ISO string for storage (preserves date and time, handles timezone)
    // Converts local date/time to ISO string preserving the intended date/time values
    const dateToISO = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      // Store as local time converted to UTC (preserves the date/time user selected)
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
    };

    // Update in Supabase
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.startDate !== undefined) updateData.start_date = dateToISO(updates.startDate);
    if (updates.endDate !== undefined) updateData.end_date = dateToISO(updates.endDate);
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.color !== undefined) updateData.color = updates.color || null;

    const { error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

    if (updateError) {
      throw new Error(`Failed to update project: ${updateError.message}`);
    }

    // Update local state
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id === projectId) {
          const updated = { ...project, ...updates };
          if (selectedProject?.id === projectId) {
            setSelectedProject(updated);
          }
          return updated;
        }
        return project;
      })
    );
  }, [selectedProject, useSupabase]);

  const deleteProject = useCallback(async (projectId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
      // Fallback to localStorage
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
      return;
    }

    // Delete from Supabase (tasks will be deleted via CASCADE)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      throw new Error(`Failed to delete project: ${deleteError.message}`);
    }

    // Update local state
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
  }, [selectedProject, useSupabase]);

  const selectProject = useCallback((project: Project | null) => {
    setSelectedProject(project);
  }, []);

  const addTask = useCallback(async (projectId: string, taskData: Omit<Task, 'id'>): Promise<Task> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
      // Fallback to localStorage
      const newTask: Task = {
        ...taskData,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? { ...project, tasks: [...project.tasks, newTask] }
            : project
        )
      );
      if (selectedProject?.id === projectId) {
        setSelectedProject((prev) =>
          prev ? { ...prev, tasks: [...prev.tasks, newTask] } : null
        );
      }
      return newTask;
    }

    // Helper to convert Date to ISO string for storage (preserves date and time, handles timezone)
    // Converts local date/time to ISO string preserving the intended date/time values
    const dateToISO = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      // Store as local time converted to UTC (preserves the date/time user selected)
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
    };

    // Save to Supabase
    const { data: insertedTask, error: insertError } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        name: taskData.name,
        description: taskData.description || null,
        start_date: dateToISO(taskData.startDate),
        end_date: taskData.endDate ? dateToISO(taskData.endDate) : null,
        estimated_hours: taskData.estimatedHours || null,
        status: taskData.status,
        assignee: taskData.assignee || null,
        color: taskData.color || null,
        dependencies: taskData.dependencies || null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create task: ${insertError.message}`);
    }

    // Save time entries if provided
    const timeEntries = taskData.timeEntries || [];
    if (timeEntries.length > 0) {
      // Helper to convert Date to date string for time_entries (DATE type)
      const dateToDateString = (date: Date): string => {
        if (date instanceof Date) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        // Already a string in YYYY-MM-DD format
        return date;
      };

      const timeEntriesToInsert = timeEntries.map(entry => ({
        task_id: insertedTask.id,
        date: dateToDateString(entry.date),
        hours: entry.hours,
        notes: entry.notes || null,
      }));

      const { error: timeEntriesError } = await supabase
        .from('time_entries')
        .insert(timeEntriesToInsert);

      if (timeEntriesError) {
        console.warn('Error saving time entries:', timeEntriesError);
      }
    }

    // Reload time entries for the new task
    const { data: loadedTimeEntries } = await supabase
      .from('time_entries')
      .select('*')
      .eq('task_id', insertedTask.id)
      .order('date', { ascending: false });

    const timeEntriesList = (loadedTimeEntries || []).map((dbEntry: any) => ({
      id: dbEntry.id,
      taskId: dbEntry.task_id,
      date: new Date(dbEntry.date),
      hours: Number(dbEntry.hours),
      notes: dbEntry.notes || undefined,
      createdAt: dbEntry.created_at ? new Date(dbEntry.created_at) : undefined,
    }));

    const newTask = dbTaskToTask(insertedTask, timeEntriesList);
    
    // Update local state
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, tasks: [...project.tasks, newTask] }
          : project
      )
    );
    if (selectedProject?.id === projectId) {
      setSelectedProject((prev) =>
        prev ? { ...prev, tasks: [...prev.tasks, newTask] } : null
      );
    }
    return newTask;
  }, [selectedProject, useSupabase]);

  const updateTask = useCallback(async (projectId: string, taskId: string, updates: Partial<Task>) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
      // Fallback to localStorage
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId ? { ...task, ...updates } : task
                ),
              }
            : project
        )
      );
      if (selectedProject?.id === projectId) {
        setSelectedProject((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((task) =>
                  task.id === taskId ? { ...task, ...updates } : task
                ),
              }
            : null
        );
      }
      return;
    }

    // Helper to convert Date to ISO string for storage (preserves date and time, handles timezone)
    // Converts local date/time to ISO string preserving the intended date/time values
    const dateToISO = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      // Store as local time converted to UTC (preserves the date/time user selected)
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
    };

    // Update in Supabase
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.startDate !== undefined) updateData.start_date = dateToISO(updates.startDate);
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate ? dateToISO(updates.endDate) : null;
    if (updates.estimatedHours !== undefined) updateData.estimated_hours = updates.estimatedHours || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.assignee !== undefined) updateData.assignee = updates.assignee || null;
    if (updates.color !== undefined) updateData.color = updates.color || null;
    if (updates.dependencies !== undefined) updateData.dependencies = updates.dependencies || null;

    // Handle time entries update if provided
    if (updates.timeEntries !== undefined) {
      // Delete existing time entries
      const { error: deleteError } = await supabase
        .from('time_entries')
        .delete()
        .eq('task_id', taskId);

      if (deleteError) {
        console.warn('Error deleting old time entries:', deleteError);
      }

      // Helper to convert Date to date string for time_entries
      const dateToDateString = (date: Date | string): string => {
        if (date instanceof Date) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        return date; // Already a string in YYYY-MM-DD format
      };

      // Insert new time entries
      if (updates.timeEntries.length > 0) {
        const timeEntriesToInsert = updates.timeEntries.map(entry => ({
          task_id: taskId,
          date: dateToDateString(entry.date),
          hours: entry.hours,
          notes: entry.notes || null,
        }));

        const { error: insertError } = await supabase
          .from('time_entries')
          .insert(timeEntriesToInsert);

        if (insertError) {
          console.warn('Error inserting time entries:', insertError);
        }
      }
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (updateError) {
      throw new Error(`Failed to update task: ${updateError.message}`);
    }

    // Update local state
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id === taskId ? { ...task, ...updates } : task
              ),
            }
          : project
      )
    );
    if (selectedProject?.id === projectId) {
      setSelectedProject((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((task) =>
                task.id === taskId ? { ...task, ...updates } : task
              ),
            }
          : null
      );
    }
  }, [selectedProject, useSupabase]);

  const deleteTask = useCallback(async (projectId: string, taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
      // Fallback to localStorage
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? { ...project, tasks: project.tasks.filter((t) => t.id !== taskId) }
            : project
        )
      );
      if (selectedProject?.id === projectId) {
        setSelectedProject((prev) =>
          prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : null
        );
      }
      return;
    }

    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (deleteError) {
      throw new Error(`Failed to delete task: ${deleteError.message}`);
    }

    // Update local state
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, tasks: project.tasks.filter((t) => t.id !== taskId) }
          : project
      )
    );
    if (selectedProject?.id === projectId) {
      setSelectedProject((prev) =>
        prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : null
      );
    }
  }, [selectedProject, useSupabase]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        isLoading,
        error,
        addProject,
        updateProject,
        deleteProject,
        selectProject,
        addTask,
        updateTask,
        deleteTask,
        refreshProjects: loadProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
