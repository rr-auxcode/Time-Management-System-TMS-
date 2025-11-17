import { useState, useCallback } from 'react';
import { Project } from '../types';

export const useProjects = (initialProjects: Project[] = []) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const addProject = useCallback((project: Project) => {
    setProjects((prev) => [...prev, project]);
  }, []);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
    );
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
  }, [selectedProject]);

  const selectProject = useCallback((project: Project | null) => {
    setSelectedProject(project);
  }, []);

  return {
    projects,
    selectedProject,
    addProject,
    updateProject,
    deleteProject,
    selectProject,
  };
};

