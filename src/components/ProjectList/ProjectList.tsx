import React from 'react';
import { Project } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import './ProjectList.css';

interface ProjectListProps {
  onNewProjectClick: () => void;
  onEditProjectClick: (project: Project) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  onNewProjectClick,
  onEditProjectClick,
}) => {
  const { projects, selectedProject, selectProject, deleteProject } = useProjects();

  const handleProjectClick = (project: Project) => {
    selectProject(selectedProject?.id === project.id ? null : project);
  };

  const handleDelete = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This will also delete all its tasks.`)) {
      deleteProject(project.id);
    }
  };

  const handleEdit = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    onEditProjectClick(project);
  };

  return (
    <div className="project-list">
      <div className="project-list-header">
        <h2>Projects</h2>
        <button className="add-project-btn" onClick={onNewProjectClick}>
          + New Project
        </button>
      </div>
      <div className="project-items">
        {projects.length === 0 ? (
          <div className="project-empty">
            <p>No projects yet. Create your first project to get started!</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={`project-item ${selectedProject?.id === project.id ? 'selected' : ''}`}
              onClick={() => handleProjectClick(project)}
            >
              <div
                className="project-color-indicator"
                style={{ backgroundColor: project.color || '#f97316' }}
              />
              <div className="project-info">
                <h3 className="project-name">{project.name}</h3>
                <p className="project-meta">
                  {project.tasks.length} {project.tasks.length === 1 ? 'task' : 'tasks'} • {project.status}
                </p>
              </div>
              <div className="project-actions">
                <button
                  className="project-action-btn edit"
                  onClick={(e) => handleEdit(e, project)}
                  title="Edit project"
                >
                  ✎
                </button>
                <button
                  className="project-action-btn delete"
                  onClick={(e) => handleDelete(e, project)}
                  title="Delete project"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

