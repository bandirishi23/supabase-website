-- Create pitch_templates table for storing reusable pitch templates
CREATE TABLE IF NOT EXISTS public.pitch_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- e.g., 'cold_email', 'follow_up', 'introduction'
  subject VARCHAR(500), -- Email subject line template
  template TEXT NOT NULL,
  variables JSONB, -- List of required variables/placeholders
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_pitches table for storing generated pitch history
CREATE TABLE IF NOT EXISTS public.generated_pitches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.pitch_templates(id) ON DELETE SET NULL,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
  recipient_data JSONB NOT NULL, -- The contact/row data used
  generated_subject TEXT,
  generated_content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'failed', 'scheduled'
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_opened_at TIMESTAMP WITH TIME ZONE,
  email_clicked_at TIMESTAMP WITH TIME ZONE,
  sendgrid_message_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_settings table for storing user email configuration
CREATE TABLE IF NOT EXISTS public.email_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  reply_to_email VARCHAR(255),
  sendgrid_api_key TEXT, -- Encrypted in production
  daily_send_limit INTEGER DEFAULT 100,
  emails_sent_today INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pitch_templates_user_id ON public.pitch_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_pitch_templates_category ON public.pitch_templates(category);
CREATE INDEX IF NOT EXISTS idx_generated_pitches_user_id ON public.generated_pitches(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_pitches_template_id ON public.generated_pitches(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_pitches_dataset_id ON public.generated_pitches(dataset_id);
CREATE INDEX IF NOT EXISTS idx_generated_pitches_status ON public.generated_pitches(status);
CREATE INDEX IF NOT EXISTS idx_email_settings_user_id ON public.email_settings(user_id);

-- Enable Row Level Security
ALTER TABLE public.pitch_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pitch_templates
CREATE POLICY "Users can view own pitch templates" 
  ON public.pitch_templates
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pitch templates" 
  ON public.pitch_templates
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pitch templates" 
  ON public.pitch_templates
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pitch templates" 
  ON public.pitch_templates
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for generated_pitches
CREATE POLICY "Users can view own generated pitches" 
  ON public.generated_pitches
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated pitches" 
  ON public.generated_pitches
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated pitches" 
  ON public.generated_pitches
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated pitches" 
  ON public.generated_pitches
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for email_settings
CREATE POLICY "Users can view own email settings" 
  ON public.email_settings
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email settings" 
  ON public.email_settings
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email settings" 
  ON public.email_settings
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own email settings" 
  ON public.email_settings
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to update usage count when a pitch is generated
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE public.pitch_templates
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment usage count
CREATE TRIGGER increment_template_usage_trigger
  AFTER INSERT ON public.generated_pitches
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_usage();

-- Function to reset daily email limit
CREATE OR REPLACE FUNCTION reset_daily_email_limit()
RETURNS void AS $$
BEGIN
  UPDATE public.email_settings
  SET emails_sent_today = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Update trigger for updated_at columns
CREATE TRIGGER update_pitch_templates_updated_at
  BEFORE UPDATE ON public.pitch_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();