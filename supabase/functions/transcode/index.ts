import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error("Job ID is required");
    }

    console.log(`Starting transcoding job: ${jobId}`);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from("transcoding_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    // Update status to processing
    await supabase
      .from("transcoding_jobs")
      .update({ status: "processing", progress: 10 })
      .eq("id", jobId);

    console.log(`Processing job: ${job.original_filename}`);

    // NOTE: In a production environment, this is where you would:
    // 1. Download the source file from storage
    // 2. Run FFmpeg to transcode to HLS/DASH format
    // 3. Upload the transcoded segments to storage
    // 4. Generate the manifest files (m3u8 for HLS, mpd for DASH)
    // 5. Update the job with the output URL

    // For now, we'll simulate the transcoding process
    // In production, you would integrate with a video processing service
    // or run FFmpeg in a containerized environment

    // Simulate processing with progress updates
    for (let progress = 20; progress <= 90; progress += 10) {
      await supabase
        .from("transcoding_jobs")
        .update({ progress })
        .eq("id", jobId);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Simulate completion
    const outputUrl = `https://example.com/transcoded/${job.id}/master.m3u8`;

    await supabase
      .from("transcoding_jobs")
      .update({
        status: "completed",
        progress: 100,
        output_url: outputUrl,
      })
      .eq("id", jobId);

    console.log(`Transcoding completed for job: ${jobId}`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        message: "Transcoding completed successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Transcoding error:", error);

    // Update job status to failed
    try {
      const { jobId } = await req.json();
      if (jobId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase
          .from("transcoding_jobs")
          .update({
            status: "failed",
            error_message: error.message,
          })
          .eq("id", jobId);
      }
    } catch (updateError) {
      console.error("Failed to update job status:", updateError);
    }

    return new Response(
      JSON.stringify({
        error: error.message || "Transcoding failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
