-- Add resolution tracking for multi-bitrate streaming
ALTER TABLE public.transcoding_jobs 
ADD COLUMN resolution_variants jsonb DEFAULT '[]'::jsonb,
ADD COLUMN total_size_bytes bigint DEFAULT 0,
ADD COLUMN processing_node text,
ADD COLUMN priority integer DEFAULT 5,
ADD COLUMN retry_count integer DEFAULT 0,
ADD COLUMN estimated_duration integer;

-- Create index for efficient job queuing and processing
CREATE INDEX idx_jobs_status_priority ON public.transcoding_jobs(status, priority DESC, created_at ASC);
CREATE INDEX idx_jobs_user_status ON public.transcoding_jobs(user_id, status);
CREATE INDEX idx_jobs_processing_node ON public.transcoding_jobs(processing_node) WHERE status = 'processing';

-- Create job queue statistics view
CREATE OR REPLACE VIEW public.transcoding_stats AS
SELECT 
  status,
  COUNT(*) as job_count,
  SUM(total_size_bytes) as total_size,
  AVG(progress) as avg_progress,
  MIN(created_at) as oldest_job,
  MAX(created_at) as newest_job
FROM public.transcoding_jobs
GROUP BY status;

-- Enable realtime for live job updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcoding_jobs;