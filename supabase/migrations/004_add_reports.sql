-- Create reports table to store hours reports for users
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  report_data JSONB NOT NULL, -- Stores the PersonHoursReport data
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_recipient_email ON reports(recipient_email);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's email (with security definer)
-- Create in public schema, not auth schema (regular users can't create in auth schema)
CREATE OR REPLACE FUNCTION public.user_email()
RETURNS TEXT AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policy: Users can only see reports sent to their email
CREATE POLICY "Users can view their own reports"
  ON reports
  FOR SELECT
  USING (
    recipient_email = public.user_email()
    OR user_id = auth.uid() -- Report sender can also see their sent reports
  );

-- Policy: Users can update their own reports (for approval/rejection)
CREATE POLICY "Users can update their own reports"
  ON reports
  FOR UPDATE
  USING (
    recipient_email = public.user_email()
  )
  WITH CHECK (
    recipient_email = public.user_email()
  );

-- Policy: Users can insert reports (for sending to others)
CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

