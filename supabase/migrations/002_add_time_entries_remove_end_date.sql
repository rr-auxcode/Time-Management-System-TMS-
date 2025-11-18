-- Migration: Remove end_date from tasks and add time_entries table

-- First, create the time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC(10, 2) NOT NULL CHECK (hours >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for time_entries
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date DESC);

-- Add trigger for updated_at on time_entries
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for time_entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_entries
-- Users can view time entries from their own projects' tasks
CREATE POLICY "Users can view time entries from their own projects"
  ON time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = time_entries.task_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can insert time entries into their own projects' tasks
CREATE POLICY "Users can insert time entries into their own projects"
  ON time_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = time_entries.task_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can update time entries in their own projects' tasks
CREATE POLICY "Users can update time entries in their own projects"
  ON time_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = time_entries.task_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = time_entries.task_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can delete time entries from their own projects' tasks
CREATE POLICY "Users can delete time entries from their own projects"
  ON time_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = time_entries.task_id
      AND projects.user_id = auth.uid()
    )
  );

-- Now remove end_date from tasks (if it exists)
-- Note: This will preserve existing data - end_date column will be removed but data is already migrated
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE tasks DROP COLUMN end_date;
  END IF;
END $$;

-- Also remove hours_spent if it exists (we're using time_entries now)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'hours_spent'
  ) THEN
    ALTER TABLE tasks DROP COLUMN hours_spent;
  END IF;
END $$;

