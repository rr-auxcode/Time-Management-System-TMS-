import React, { useRef, useEffect, useState } from 'react';
import { Task, Project, TimelineView } from '../../types';
import {
  calculateTimelineRange,
  calculateTaskPosition,
  generateTimelineHeaders,
  getDaysBetween,
  getPixelsPerDay,
} from '../../utils/ganttCalculations';
import './GanttChart.css';

interface GanttChartProps {
  projects: Project[];
  view: TimelineView;
  onTaskClick?: (task: Task) => void;
  onTaskUpdate?: (task: Task) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  projects,
  view,
  onTaskClick,
  onTaskUpdate: _onTaskUpdate,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(1000);

  // Get all tasks from all projects
  const allTasks = projects.flatMap((project) => project.tasks);

  // Calculate timeline range
  const { start: timelineStart, end: timelineEnd } = calculateTimelineRange(view);
  const days = getDaysBetween(timelineStart, timelineEnd);
  const pixelsPerDay = getPixelsPerDay(timelineWidth, days);

  // Generate timeline headers
  const timelineHeaders = generateTimelineHeaders(view, timelineWidth);

  // Calculate task positions
  const taskPositions = allTasks
    .map((task, index) => calculateTaskPosition(task, timelineStart, timelineEnd, pixelsPerDay, index))
    .filter((pos): pos is NonNullable<typeof pos> => pos !== null);

  // Update timeline width when container resizes
  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (allTasks.length === 0) {
    return (
      <div className="gantt-chart">
        <div className="gantt-empty">
          <p>No tasks available. Create a project and add tasks to see them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-chart">
      <div className="gantt-header">
        <div className="gantt-sidebar-header">
          <h3>Tasks</h3>
        </div>
        <div className="gantt-timeline-header" ref={timelineRef}>
          <div className="timeline-headers-container" style={{ width: `${timelineWidth}px` }}>
            {timelineHeaders.map((header, index) => (
              <div
                key={index}
                className="timeline-header-cell"
                style={{
                  left: `${header.x}px`,
                  width: `${header.width}px`,
                }}
              >
                {header.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="gantt-body">
        <div className="gantt-sidebar">
          {allTasks.map((task) => (
            <div key={task.id} className="gantt-task-row" style={{ height: '60px' }}>
              <div className="task-name" title={task.name}>
                {task.name}
              </div>
              <div className="task-hours">
                {task.hoursSpent}h
                {task.estimatedHours && ` / ${task.estimatedHours}h`}
              </div>
              {task.assignee && (
                <div className="task-assignee">{task.assignee}</div>
              )}
            </div>
          ))}
        </div>
        <div className="gantt-timeline" style={{ width: `${timelineWidth}px` }}>
          {taskPositions.map((position) => (
            <div
              key={position.task.id}
              className="gantt-task-bar-wrapper"
              style={{
                position: 'absolute',
                top: `${position.y}px`,
                left: `${position.x}px`,
                width: `${position.width}px`,
                height: `${position.height}px`,
              }}
            >
              <div
                className={`gantt-task-bar status-${position.task.status}`}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: position.task.color || '#f97316',
                }}
                onClick={() => onTaskClick?.(position.task)}
                title={`${position.task.name} - ${position.task.hoursSpent}h${position.task.estimatedHours ? ` / ${position.task.estimatedHours}h` : ''}`}
              >
                <span className="task-bar-label">{position.task.name}</span>
                {position.task.estimatedHours && position.task.estimatedHours > 0 && (
                  <div
                    className="task-progress"
                    style={{
                      width: `${Math.min((position.task.hoursSpent / position.task.estimatedHours) * 100, 100)}%`,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

