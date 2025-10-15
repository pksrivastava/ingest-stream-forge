import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle, XCircle, Loader2, Play, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TranscodeButton } from "./TranscodeButton";
import { VideoPlayer } from "./VideoPlayer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ResolutionVariant {
  resolution: string;
  width: number;
  height: number;
  bitrate: number;
  url: string;
  size_bytes: number;
}

interface Job {
  id: string;
  original_filename: string;
  status: string;
  progress: number;
  output_format: string;
  created_at: string;
  output_url: string | null;
  error_message: string | null;
  resolution_variants: ResolutionVariant[] | null;
  total_size_bytes: number | null;
  estimated_duration: number | null;
}

export const JobQueue = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("transcoding_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs((data as unknown as Job[]) || []);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load transcoding jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("transcoding_jobs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transcoding_jobs",
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const deleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase.from("transcoding_jobs").delete().eq("id", jobId);

      if (error) throw error;

      toast({
        title: "Job deleted",
        description: "Transcoding job has been removed",
      });
    } catch (error: any) {
      console.error("Error deleting job:", error);
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "failed":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-muted text-muted-foreground";
      case "processing":
        return "bg-processing text-white";
      case "completed":
        return "bg-success text-white";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-2">
          <Film className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">No transcoding jobs yet</p>
          <p className="text-sm text-muted-foreground">Upload a file to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcoding Queue</CardTitle>
        <CardDescription>Monitor your media transcoding jobs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobs.map((job) => (
          <div key={job.id} className="p-4 rounded-lg border bg-card space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{job.original_filename}</h4>
                <p className="text-sm text-muted-foreground">
                  Format: {job.output_format.toUpperCase()} • {new Date(job.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(job.status)} flex items-center gap-1`}>
                  {getStatusIcon(job.status)}
                  {job.status}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => deleteJob(job.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <TranscodeButton jobId={job.id} status={job.status} />

            {job.status === "processing" && (
              <div className="space-y-1">
                <Progress value={job.progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{job.progress}%</p>
              </div>
            )}

            {job.status === "completed" && (
              <div className="space-y-2">
                {job.resolution_variants && job.resolution_variants.length > 0 && (
                  <div className="text-xs space-y-1">
                    <p className="font-medium text-muted-foreground">Available Resolutions:</p>
                    <div className="flex flex-wrap gap-1">
                      {job.resolution_variants.map((variant) => (
                        <Badge key={variant.resolution} variant="secondary" className="text-xs">
                          {variant.resolution}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {job.total_size_bytes && (
                  <p className="text-xs text-muted-foreground">
                    Total size: {formatBytes(job.total_size_bytes)}
                  </p>
                )}

                {job.estimated_duration && (
                  <p className="text-xs text-muted-foreground">
                    Processing time: {formatDuration(job.estimated_duration)}
                  </p>
                )}

                {job.output_url && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Play className="w-4 h-4 mr-2" />
                        Play Video
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{job.original_filename}</DialogTitle>
                      </DialogHeader>
                      <VideoPlayer src={job.output_url} type="hls" />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}

            {job.status === "failed" && job.error_message && (
              <p className="text-sm text-destructive">{job.error_message}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const Film = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M7 3v18" />
    <path d="M3 7.5h4" />
    <path d="M3 12h18" />
    <path d="M3 16.5h4" />
    <path d="M17 3v18" />
    <path d="M17 7.5h4" />
    <path d="M17 16.5h4" />
  </svg>
);
