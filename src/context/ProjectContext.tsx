import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, Task,  TimeEntry } from '../types';
import { supabase } from '../lib/supabase';
import { migrateLocalStorageToSupabase, isMigrationComplete, hasLocalStorageData } from '../utils/dataMigration';
import { useAuth } from './AuthContext';

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

function dbTaskToTask(dbTask: any, timeEntries: TimeEntry[] = []): Task {
  return {
    id: dbTask.id,
    projectId: dbTask.project_id,
    name: dbTask.name,
    description: dbTask.description || undefined,
    startDate: new Date(dbTask.start_date),
    endDate: dbTask.end_date ? new Date(dbTask.end_date) : undefined,
    estimatedHours: dbTask.estimated_hours ? Number(dbTask.estimated_hours) : undefined,
    status: dbTask.status,
    assignee: dbTask.assignee || undefined,
    color: dbTask.color || undefined,
    dependencies: dbTask.dependencies || undefined,
    timeEntries: timeEntries.length > 0 ? timeEntries : undefined,
  };
}

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, user: authUser, isSuperAdmin, isClient } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useSupabase, setUseSupabase] = useState(true);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!user || authError) {
        console.warn('User not authenticated, using localStorage');
        loadFromLocalStorage();
        setUseSupabase(false);
        return;
      }

      if (hasLocalStorageData() && !isMigrationComplete()) {
        console.log('Migrating data from localStorage to Supabase...');
        const migrationResult = await migrateLocalStorageToSupabase();
        if (migrationResult.success) {
          console.log(`Migration complete: ${migrationResult.projectsMigrated} projects, ${migrationResult.tasksMigrated} tasks migrated`);
        } else {
          console.warn('Migration failed:', migrationResult.error);
        }
      }

      let projectsQuery = supabase
        .from('projects')
        .select('*');

      if (isSuperAdmin) {
        projectsQuery = projectsQuery.order('created_at', { ascending: false });
      } else if (isClient && authUser?.email) {
        const { data: accessData, error: accessError } = await supabase
          .from('project_client_access')
          .select('project_id')
          .eq('client_email', authUser.email.toLowerCase());

        if (accessError) {
          throw accessError;
        }

        const accessibleProjectIds = accessData?.map(a => a.project_id) || [];
        
        if (accessibleProjectIds.length === 0) {
          setProjects([]);
          setIsLoading(false);
          return;
        }

        projectsQuery = projectsQuery
          .in('id', accessibleProjectIds)
          .order('created_at', { ascending: false });
      } else {
        projectsQuery = projectsQuery
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
      }

      const { data: projectsData, error: projectsError } = await projectsQuery;

      if (projectsError) {
        throw projectsError;
      }

      if (!projectsData || projectsData.length === 0) {
        setProjects([]);
        setIsLoading(false);
        return;
      }

      const projectIds = projectsData.map(p => p.id);
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('project_id', projectIds)
        .order('start_date', { ascending: true })
        .order('end_date', { ascending: true, nullsFirst: false });

      if (tasksError) {
        throw tasksError;
      }

      const taskIds = (tasksData || []).map((t: any) => t.id);
      const { data: timeEntriesData, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('*')
        .in('task_id', taskIds.length > 0 ? taskIds : ['00000000-0000-0000-0000-000000000000'])
        .order('date', { ascending: false });

      if (timeEntriesError) {
        console.warn('Error loading time entries:', timeEntriesError);
      }

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

      const tasksByProject = new Map<string, Task[]>();
      (tasksData || []).forEach((dbTask: any) => {
        const timeEntries = timeEntriesByTask.get(dbTask.id) || [];
        const task = dbTaskToTask(dbTask, timeEntries);
        if (!tasksByProject.has(task.projectId)) {
          tasksByProject.set(task.projectId, []);
        }
        tasksByProject.get(task.projectId)!.push(task);
      });

      const loadedProjects = projectsData.map((dbProject: any) => {
        const tasks = tasksByProject.get(dbProject.id) || [];
        return dbProjectToProject(dbProject, tasks);
      });

      setProjects(loadedProjects);
      setUseSupabase(true);
    } catch (err) {
      console.error('Error loading projects from Supabase:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      loadFromLocalStorage();
      setUseSupabase(false);
    } finally {
      setIsLoading(false);
    }
  }, [role, isSuperAdmin, isClient, authUser?.email]);

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

  const saveToLocalStorage = useCallback((projectsToSave: Project[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsToSave));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (projects.length > 0) {
      saveToLocalStorage(projects);
    }
  }, [projects, saveToLocalStorage]);

  const addProject = useCallback(async (projectData: Omit<Project, 'id' | 'tasks'>): Promise<Project> => {
    if (isClient) {
      throw new Error('Clients cannot create projects');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
      const newProject: Project = {
        ...projectData,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tasks: [],
      };
      setProjects((prev) => [...prev, newProject]);
      return newProject;
    }

    const dateToISO = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
    };

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
  }, [useSupabase, isClient]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    if (isClient) {
      throw new Error('Clients cannot update projects');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
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

    const dateToISO = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
    };

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
  }, [selectedProject, useSupabase, isClient]);

  const deleteProject = useCallback(async (projectId: string) => {
    if (isClient) {
      throw new Error('Clients cannot delete projects');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
      return;
    }

    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      throw new Error(`Failed to delete project: ${deleteError.message}`);
    }

    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
  }, [selectedProject, useSupabase, isClient]);

  const selectProject = useCallback((project: Project | null) => {
    setSelectedProject(project);
  }, []);

  const addTask = useCallback(async (projectId: string, taskData: Omit<Task, 'id'>): Promise<Task> => {
    if (isClient) {
      throw new Error('Clients cannot create tasks');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
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

    const dateToISO = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
    };

    const { data: insertedTask, error: insertError } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        name: taskData.name,
        description: taskData.description || null,
        start_date: dateToISO(taskData.startDate),
        end_date: taskData.endDate !== undefined && taskData.endDate !== null ? dateToISO(taskData.endDate) : null,
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

    const timeEntries = taskData.timeEntries || [];
    if (timeEntries.length > 0) {
      const dateToDateString = (date: Date): string => {
        if (date instanceof Date) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
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
  }, [selectedProject, useSupabase, isClient]);

  const updateTask = useCallback(async (projectId: string, taskId: string, updates: Partial<Task>) => {
    if (isClient) {
      throw new Error('Clients cannot update tasks');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
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

    const dateToISO = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
    };

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

    if (updates.timeEntries !== undefined) {
      const { error: deleteError } = await supabase
        .from('time_entries')
        .delete()
        .eq('task_id', taskId);

      if (deleteError) {
        console.warn('Error deleting old time entries:', deleteError);
      }

      const dateToDateString = (date: Date | string): string => {
        if (date instanceof Date) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        return date;
      };

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
  }, [selectedProject, useSupabase, isClient]);

  const deleteTask = useCallback(async (projectId: string, taskId: string) => {
    if (isClient) {
      throw new Error('Clients cannot delete tasks');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !useSupabase) {
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

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (deleteError) {
      throw new Error(`Failed to delete task: ${deleteError.message}`);
    }

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
  }, [selectedProject, useSupabase, isClient]);

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
