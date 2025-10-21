import { useState, useCallback } from "react";
import { Upload, Film, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface BulkUploadProps {
  onUploadComplete: () => void;
}

export const BulkUpload = ({ onUploadComplete }: BulkUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    const allowedTypes = ["video/mp4", "video/quicktime", "audio/mpeg", "audio/mp3", "video/x-matroska", "video/webm"];
    return allowedTypes.includes(file.type) || /\.(mp4|mov|mp3|mkv|webm)$/i.test(file.name);
  };

  const handleAddFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(newFiles).forEach(file => {
      if (validateFile(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid files",
        description: `${invalidFiles.length} file(s) skipped. Only MP4, MOV, MP3, MKV, WebM supported.`,
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      toast({
        title: "Files added",
        description: `${validFiles.length} file(s) ready for upload`,
      });
    }
  }, [toast]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkUpload = async () => {
    if (files.length === 0) return;

    if (files.length > 100) {
      toast({
        title: "Too many files",
        description: "Maximum 100 files per batch",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const jobIds: string[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Upload to storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("source-files")
          .upload(fileName, file);

        if (uploadError) {
          console.error(`Upload error for ${file.name}:`, uploadError);
          continue;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("source-files").getPublicUrl(fileName);

        // Create transcoding job
        const { data: job, error: jobError } = await supabase
          .from("transcoding_jobs")
          .insert({
            user_id: user.id,
            original_filename: file.name,
            input_file_url: publicUrl,
            output_format: "hls",
            status: "pending",
          })
          .select()
          .single();

        if (jobError) {
          console.error(`Job creation error for ${file.name}:`, jobError);
          continue;
        }

        jobIds.push(job.id);
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      if (jobIds.length === 0) {
        throw new Error("No jobs created successfully");
      }

      // Start bulk transcoding
      const { data, error } = await supabase.functions.invoke("bulk-transcode", {
        body: { jobIds },
      });

      if (error) throw error;

      toast({
        title: "Bulk upload successful",
        description: `${jobIds.length} file(s) queued for transcoding`,
      });

      setFiles([]);
      onUploadComplete();
    } catch (error: any) {
      console.error("Bulk upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleAddFiles(e.dataTransfer.files);
    },
    [handleAddFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleAddFiles(e.target.files);
      // Reset input to allow selecting same files again
      e.target.value = "";
    },
    [handleAddFiles]
  );

  return (
    <div className="space-y-4">
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
              {uploading ? "Uploading..." : isDragging ? "Drop files here" : "Bulk Upload Media Files"}
            </h3>
            <p className="text-muted-foreground">
              Drag & drop multiple files or click to select (Max 100 files)
            </p>
            <p className="text-sm text-muted-foreground">
              Supports: MP4, MP3, MOV, MKV, WebM
            </p>
          </div>

          {uploading && (
            <div className="w-full max-w-md space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                {uploadProgress}% complete
              </p>
            </div>
          )}

          <input
            type="file"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileInput}
            accept="video/*,audio/*,.mp4,.mp3,.mov,.mkv,.webm"
            disabled={uploading}
          />
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">
                Selected Files ({files.length})
              </h4>
              <Button
                onClick={handleBulkUpload}
                disabled={uploading || files.length === 0}
                className="w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload & Transcode All
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Film className="w-5 h-5 flex-shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
