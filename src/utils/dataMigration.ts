import { Project, Task } from '../types';
import { supabase } from '../lib/supabase';

/**
 * Migrate projects and tasks from localStorage to Supabase
 */
export async function migrateLocalStorageToSupabase(): Promise<{
  success: boolean;
  projectsMigrated: number;
  tasksMigrated: number;
  error?: string;
}> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        projectsMigrated: 0,
        tasksMigrated: 0,
        error: 'User not authenticated',
      };
    }

    // Load projects from localStorage
    const stored = localStorage.getItem('tms-projects');
    if (!stored) {
      return {
        success: true,
        projectsMigrated: 0,
        tasksMigrated: 0,
      };
    }

    const parsedProjects: Project[] = JSON.parse(stored);
    
    // Convert date strings to Date objects
    const projectsWithDates = parsedProjects.map((project: any) => ({
      ...project,
      startDate: new Date(project.startDate),
      endDate: new Date(project.endDate),
      tasks: project.tasks.map((task: any) => ({
        ...task,
        startDate: new Date(task.startDate),
        endDate: new Date(task.endDate),
        hoursSpent: task.hoursSpent ?? 0,
        estimatedHours: task.estimatedHours,
      })),
    }));

    let projectsMigrated = 0;
    let tasksMigrated = 0;

    // Migrate each project
    for (const project of projectsWithDates) {
      // Insert project
      const { data: insertedProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          id: project.id,
          user_id: user.id,
          name: project.name,
          description: project.description || null,
          start_date: project.startDate.toISOString(),
          end_date: project.endDate.toISOString(),
          status: project.status,
          color: project.color || null,
        })
        .select()
        .single();

      if (projectError) {
        console.error('Error migrating project:', project.name, projectError);
        continue;
      }

      projectsMigrated++;

      // Migrate tasks for this project
      if (project.tasks && project.tasks.length > 0) {
        const tasksToInsert = project.tasks.map((task: Task) => ({
          id: task.id,
          project_id: insertedProject.id,
          name: task.name,
          description: task.description || null,
          start_date: task.startDate.toISOString(),
          end_date: task.endDate.toISOString(),
          hours_spent: task.hoursSpent,
          estimated_hours: task.estimatedHours || null,
          status: task.status,
          assignee: task.assignee || null,
          color: task.color || null,
          dependencies: task.dependencies || null,
        }));

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);

        if (tasksError) {
          console.error('Error migrating tasks for project:', project.name, tasksError);
        } else {
          tasksMigrated += tasksToInsert.length;
        }
      }
    }

    // Mark migration as complete in localStorage
    localStorage.setItem('tms-migration-complete', 'true');
    // Optionally, backup the old data before clearing
    localStorage.setItem('tms-projects-backup', stored);

    return {
      success: true,
      projectsMigrated,
      tasksMigrated,
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      projectsMigrated: 0,
      tasksMigrated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if migration has been completed
 */
export function isMigrationComplete(): boolean {
  return localStorage.getItem('tms-migration-complete') === 'true';
}

/**
 * Check if there's data in localStorage that needs migration
 */
export function hasLocalStorageData(): boolean {
  const stored = localStorage.getItem('tms-projects');
  return !!stored && stored !== '[]';
}

