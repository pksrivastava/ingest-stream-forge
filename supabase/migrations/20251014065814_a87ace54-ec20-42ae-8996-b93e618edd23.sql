-- Create transcoding jobs table
CREATE TABLE public.transcoding_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_filename TEXT NOT NULL,
  input_file_url TEXT NOT NULL,
  output_format TEXT NOT NULL DEFAULT 'hls',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  output_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transcoding_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for transcoding jobs
CREATE POLICY "Users can view their own jobs" 
ON public.transcoding_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" 
ON public.transcoding_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
ON public.transcoding_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" 
ON public.transcoding_jobs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transcoding_jobs_updated_at
BEFORE UPDATE ON public.transcoding_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for source files and transcoded outputs
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('source-files', 'source-files', false),
  ('transcoded-outputs', 'transcoded-outputs', true);

-- Storage policies for source files
CREATE POLICY "Users can upload their own source files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'source-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own source files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'source-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own source files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'source-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for transcoded outputs (public access for streaming)
CREATE POLICY "Anyone can view transcoded outputs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'transcoded-outputs');

CREATE POLICY "Users can upload their own transcoded files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'transcoded-outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own transcoded files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'transcoded-outputs' AND auth.uid()::text = (storage.foldername(name))[1]);