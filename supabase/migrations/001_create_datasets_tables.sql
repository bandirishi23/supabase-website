-- Create datasets table for storing metadata about imported files
CREATE TABLE IF NOT EXISTS public.datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  total_rows INTEGER DEFAULT 0,
  column_mappings JSONB, -- Stores selected columns, their types, and cleaning rules
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dataset_rows table for storing actual data
CREATE TABLE IF NOT EXISTS public.dataset_rows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
  row_data JSONB NOT NULL, -- Flexible storage for any column structure
  row_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON public.datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_dataset_id ON public.dataset_rows(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_dataset_id_row_index ON public.dataset_rows(dataset_id, row_index);

-- Enable Row Level Security
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_rows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for datasets table
-- Users can only see their own datasets
CREATE POLICY "Users can view own datasets" 
  ON public.datasets
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can only insert datasets for themselves
CREATE POLICY "Users can insert own datasets" 
  ON public.datasets
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own datasets
CREATE POLICY "Users can update own datasets" 
  ON public.datasets
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own datasets
CREATE POLICY "Users can delete own datasets" 
  ON public.datasets
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for dataset_rows table
-- Users can only view rows from their datasets
CREATE POLICY "Users can view rows from own datasets" 
  ON public.dataset_rows
  FOR SELECT 
  USING (
    dataset_id IN (
      SELECT id FROM public.datasets WHERE user_id = auth.uid()
    )
  );

-- Users can only insert rows to their datasets
CREATE POLICY "Users can insert rows to own datasets" 
  ON public.dataset_rows
  FOR INSERT 
  WITH CHECK (
    dataset_id IN (
      SELECT id FROM public.datasets WHERE user_id = auth.uid()
    )
  );

-- Users can only update rows in their datasets
CREATE POLICY "Users can update rows in own datasets" 
  ON public.dataset_rows
  FOR UPDATE 
  USING (
    dataset_id IN (
      SELECT id FROM public.datasets WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    dataset_id IN (
      SELECT id FROM public.datasets WHERE user_id = auth.uid()
    )
  );

-- Users can only delete rows from their datasets
CREATE POLICY "Users can delete rows from own datasets" 
  ON public.dataset_rows
  FOR DELETE 
  USING (
    dataset_id IN (
      SELECT id FROM public.datasets WHERE user_id = auth.uid()
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON public.datasets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();