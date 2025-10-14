import { useState, useCallback } from "react";
import { Upload, Film } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadProps {
  onUploadComplete: () => void;
}

export const FileUpload = ({ onUploadComplete }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) return;

      // Validate file type
      const allowedTypes = ["video/mp4", "video/quicktime", "audio/mpeg", "audio/mp3", "video/x-matroska", "video/webm"];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|mp3|mkv|webm)$/i)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a valid video or audio file (MP4, MOV, MP3, MKV, WebM)",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Not authenticated");

        // Upload to storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("source-files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("source-files").getPublicUrl(fileName);

        // Create transcoding job
        const { error: jobError } = await supabase.from("transcoding_jobs").insert({
          user_id: user.id,
          original_filename: file.name,
          input_file_url: publicUrl,
          output_format: "hls",
          status: "pending",
        });

        if (jobError) throw jobError;

        toast({
          title: "Upload successful",
          description: "Your file has been queued for transcoding",
        });

        onUploadComplete();
      } catch (error: any) {
        console.error("Upload error:", error);
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload file",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [toast, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  return (
    <Card
      className={`relative border-2 border-dashed transition-all duration-300 ${
        isDragging ? "border-primary bg-primary/5 scale-105" : "border-border hover:border-primary/50"
      } ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="p-6 rounded-full bg-primary/10 animate-gradient bg-gradient-to-br from-primary to-primary-glow">
          {uploading ? (
            <Film className="w-12 h-12 text-primary animate-pulse" />
          ) : (
            <Upload className="w-12 h-12 text-primary" />
          )}
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">
            {uploading ? "Uploading..." : isDragging ? "Drop your file here" : "Upload Media File"}
          </h3>
          <p className="text-muted-foreground">
            Drag & drop or click to upload MP4, MP3, MOV, MKV, or WebM files
          </p>
        </div>

        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileInput}
          accept="video/*,audio/*,.mp4,.mp3,.mov,.mkv,.webm"
          disabled={uploading}
        />
      </CardContent>
    </Card>
  );
};
