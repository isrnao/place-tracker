-- Enable RLS on visits table and create appropriate policies
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own visits" ON visits;
DROP POLICY IF EXISTS "Users can insert their own visits" ON visits;
DROP POLICY IF EXISTS "Users can delete their own visits" ON visits;

-- Create policy for users to view their own visits
CREATE POLICY "Users can view their own visits" ON visits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own visits
CREATE POLICY "Users can insert their own visits" ON visits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own visits
CREATE POLICY "Users can delete their own visits" ON visits
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policy for users to update their own visits (if needed)
CREATE POLICY "Users can update their own visits" ON visits
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
