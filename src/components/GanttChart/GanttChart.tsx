import React, { useRef, useEffect, useState } from 'react';
import { Task, Project, TimelineView, VacationRequest } from '../../types';
import {
  calculateTimelineRange,
  calculateTaskPosition,
  generateTimelineHeaders,
  getDaysBetween,
  getPixelsPerDay,
} from '../../utils/ganttCalculations';
import { supabase } from '../../lib/supabase';
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
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);

  const allTasks = projects.flatMap((project) => project.tasks);

  const { start: timelineStart, end: timelineEnd } = calculateTimelineRange(view);
  const days = getDaysBetween(timelineStart, timelineEnd);
  const pixelsPerDay = getPixelsPerDay(timelineWidth, days);

  const timelineHeaders = generateTimelineHeaders(view, timelineWidth);

  const taskPositions = allTasks
    .map((task, index) => calculateTaskPosition(task, timelineStart, timelineEnd, pixelsPerDay, index))
    .filter((pos): pos is NonNullable<typeof pos> => pos !== null);

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

  useEffect(() => {
    const loadVacations = async () => {
      try {
        const { data, error } = await supabase
          .from('vacation_requests')
          .select('*')
          .eq('status', 'approved')
          .gte('end_date', view.startDate.toISOString().split('T')[0])
          .lte('start_date', view.endDate.toISOString().split('T')[0]);

        if (error) {
          console.error('Error loading vacations:', error);
          return;
        }

        if (data) {
          const formatted: VacationRequest[] = data.map((req: any) => ({
            id: req.id,
            user_id: req.user_id,
            user_email: req.user_email,
            start_date: new Date(req.start_date),
            end_date: new Date(req.end_date),
            status: req.status,
            approved_by: req.approved_by || undefined,
            approved_at: req.approved_at ? new Date(req.approved_at) : undefined,
            notes: req.notes || undefined,
            created_at: new Date(req.created_at),
            updated_at: new Date(req.updated_at),
          }));
          setVacationRequests(formatted);
        }
      } catch (error) {
        console.error('Error loading vacations:', error);
      }
    };

    loadVacations();
  }, [view.startDate, view.endDate]);

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
              {timelineHeaders.map((header, index) => {
                const dayOfWeek = header.date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                
                return (
                  <div
                    key={index}
                    className={`timeline-header-cell ${isWeekend ? 'weekend' : ''}`}
                    style={{
                      left: `${header.x}px`,
                      width: `${header.width}px`,
                    }}
                  >
                    {header.label}
                  </div>
                );
              })}
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
                {task.timeEntries ? task.timeEntries.reduce((sum, entry) => sum + entry.hours, 0) : 0}h
                {task.estimatedHours && ` / ${task.estimatedHours}h`}
              </div>
              {task.endDate ? (
                <div className="task-dates" style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.125rem' }}>
                  {task.startDate.toLocaleDateString()} {task.startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - {task.endDate.toLocaleDateString()} {task.endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              ) : (
                <div className="task-dates" style={{ fontSize: '0.7rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.125rem' }}>
                  {task.startDate.toLocaleDateString()} {task.startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - No end date
                </div>
              )}
              {task.assignee && (
                <div className="task-assignee">{task.assignee}</div>
              )}
            </div>
          ))}
        </div>
            <div className="gantt-timeline" style={{ width: `${timelineWidth}px` }}>
              {timelineHeaders.map((header, index) => {
                const dayOfWeek = header.date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                if (!isWeekend) return null;
                
                return (
                  <div
                    key={`weekend-bg-${index}`}
                    className="weekend-background"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: `${header.x}px`,
                      width: `${header.width}px`,
                      height: '100%',
                      backgroundColor: '#f9fafb',
                      zIndex: 0,
                    }}
                  />
                );
              })}
              {vacationRequests
                .filter(vacation => {
                  const vacStart = new Date(vacation.start_date);
                  vacStart.setHours(0, 0, 0, 0);
                  const vacEnd = new Date(vacation.end_date);
                  vacEnd.setHours(23, 59, 59, 999);
                  return vacStart <= timelineEnd && vacEnd >= timelineStart;
                })
                .map((vacation) => {
                  const vacStart = new Date(vacation.start_date);
                  vacStart.setHours(0, 0, 0, 0);
                  const vacEnd = new Date(vacation.end_date);
                  vacEnd.setHours(23, 59, 59, 999);
                  
                  const startDate = vacStart < timelineStart ? timelineStart : vacStart;
                  const endDate = vacEnd > timelineEnd ? timelineEnd : vacEnd;
                  
                  const daysFromStart = getDaysBetween(timelineStart, startDate);
                  const vacationDays = getDaysBetween(startDate, endDate) + 1;
                  
                  const x = daysFromStart * pixelsPerDay;
                  const width = vacationDays * pixelsPerDay;
                  
                  return (
                    <div
                      key={`vacation-${vacation.id}`}
                      className="vacation-bar"
                      style={{
                        position: 'absolute',
                        top: '0px',
                        left: `${x}px`,
                        width: `${width}px`,
                        height: '100%',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderLeft: '2px solid #3b82f6',
                        borderRight: '2px solid #3b82f6',
                        zIndex: 0,
                        pointerEvents: 'none',
                      }}
                      title={`Vacation: ${vacation.user_email} (${vacation.start_date.toLocaleDateString()} - ${vacation.end_date.toLocaleDateString()})`}
                    />
                  );
                })}
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
                    zIndex: 1,
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
                title={`${position.task.name} - ${position.task.timeEntries ? position.task.timeEntries.reduce((sum, entry) => sum + entry.hours, 0) : 0}h${position.task.estimatedHours ? ` / ${position.task.estimatedHours}h` : ''}${!position.task.endDate ? ' (No end date)' : ''}`}
              >
                <span className="task-bar-label">{position.task.name}</span>
                {position.task.estimatedHours && position.task.estimatedHours > 0 && position.task.timeEntries && (
                  <div
                    className="task-progress"
                    style={{
                      width: `${Math.min((position.task.timeEntries.reduce((sum, entry) => sum + entry.hours, 0) / position.task.estimatedHours) * 100, 100)}%`,
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

