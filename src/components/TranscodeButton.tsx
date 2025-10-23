import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { transcodeToHls } from "@/lib/hlsTranscoder";

const mimeByName = (name: string) => {
  if (name.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (name.endsWith('.m4s')) return 'video/iso.segment';
  if (name.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
};

interface TranscodeButtonProps {
  jobId: string;
  status: string;
}

export const TranscodeButton = ({ jobId, status }: TranscodeButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const startTranscode = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch job info
      const { data: job, error: jobErr } = await supabase
        .from("transcoding_jobs")
        .select("input_file_url,user_id")
        .eq("id", jobId)
        .single();
      if (jobErr) throw jobErr;
      if (!job?.input_file_url) throw new Error("Missing input file URL");

      // Mark as processing
      await supabase
        .from("transcoding_jobs")
        .update({ status: "processing", progress: 1 })
        .eq("id", jobId);

      // Download source
      const res = await fetch(job.input_file_url);
      if (!res.ok) throw new Error("Failed to download source file");
      const blob = await res.blob();

      // Transcode in browser to HLS
      const hls = await transcodeToHls(blob, async (ratio) => {
        const percent = Math.max(1, Math.min(99, Math.floor(ratio * 100)));
        await supabase
          .from("transcoding_jobs")
          .update({ progress: percent })
          .eq("id", jobId);
      });

      // Upload all generated HLS files into public bucket
      const basePath = `${user.id}/${jobId}/`;
      const uploads = Object.entries(hls.files).map(async ([name, bytes]) => {
        const contentType = mimeByName(name);
        const path = `${basePath}${name}`;
        // Safely copy into a new ArrayBuffer (avoids SharedArrayBuffer typing issues)
        const arrayBuffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(arrayBuffer).set(bytes);
        const blobToUpload = new Blob([arrayBuffer], { type: contentType });
        const { error } = await supabase.storage
          .from("transcoded-outputs")
          .upload(path, blobToUpload, {
            upsert: true,
            contentType,
          });
        if (error) throw error;
        return path;
      });
      await Promise.all(uploads);

      const {
        data: { publicUrl: masterUrl },
      } = supabase.storage
        .from("transcoded-outputs")
        .getPublicUrl(`${basePath}${hls.masterName}`);

      const {
        data: { publicUrl: variantUrl },
      } = supabase.storage
        .from("transcoded-outputs")
        .getPublicUrl(`${basePath}${hls.variantName}`);

      const totalSize = Object.values(hls.files).reduce(
        (a, u8) => a + u8.byteLength,
        0
      );

      await supabase
        .from("transcoding_jobs")
        .update({
          status: "completed",
          progress: 100,
          output_url: masterUrl,
          resolution_variants: [
            {
              resolution: hls.resolution.label,
              width: hls.resolution.width,
              height: hls.resolution.height,
              bitrate: hls.approxBitrate,
              url: variantUrl,
              size_bytes: totalSize,
            },
          ],
          total_size_bytes: totalSize,
        })
        .eq("id", jobId);

      toast({
        title: "Transcoding completed",
        description: "HLS playlist is ready",
      });
    } catch (error: any) {
      console.error("Transcode error:", error);
      await supabase
        .from("transcoding_jobs")
        .update({ status: "failed", error_message: error.message || "Transcode failed" })
        .eq("id", jobId);
      toast({
        title: "Error",
        description: error.message || "Failed to transcode",
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
