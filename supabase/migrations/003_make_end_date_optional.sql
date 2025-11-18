-- Migration: Make end_date optional (allow NULL) in tasks table

-- Alter tasks table to allow NULL end_date
DO $$ 
BEGIN
  -- Check if end_date column exists and is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'end_date'
    AND is_nullable = 'NO'
  ) THEN
    -- Make end_date nullable
    ALTER TABLE tasks 
    ALTER COLUMN end_date DROP NOT NULL;
    
    RAISE NOTICE 'Made end_date column nullable';
  ELSE
    RAISE NOTICE 'end_date column does not exist or is already nullable';
  END IF;
END $$;

-- Add a comment to document the optional nature
COMMENT ON COLUMN tasks.end_date IS 'Optional end date for the task. NULL means the task has no end date.';

