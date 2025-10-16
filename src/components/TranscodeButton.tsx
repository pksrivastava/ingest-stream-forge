import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TranscodeButtonProps {
  jobId: string;
  status: string;
}

export const TranscodeButton = ({ jobId, status }: TranscodeButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const startTranscode = async () => {
    console.log("Starting transcode for job:", jobId);
    setLoading(true);

    try {
      console.log("Invoking start-transcode function...");
      const { data, error } = await supabase.functions.invoke("start-transcode", {
        body: { jobId },
      });

      console.log("Function response:", { data, error });

      if (error) throw error;

      toast({
        title: "Transcoding started",
        description: "Your file is being processed",
      });
    } catch (error: any) {
      console.error("Transcode error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start transcoding",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (status !== "pending") {
    return null;
  }

  return (
    <Button onClick={startTranscode} disabled={loading} size="sm" className="w-full">
      <Play className="w-4 h-4 mr-2" />
      {loading ? "Starting..." : "Start Transcode"}
    </Button>
  );
};
