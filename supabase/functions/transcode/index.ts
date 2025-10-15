import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { jobId } = await req.json();

    // Validate jobId format
    if (!jobId || typeof jobId !== "string") {
      throw new Error("Job ID is required");
    }

    if (!UUID_REGEX.test(jobId)) {
      throw new Error("Invalid job ID format");
    }

    console.log(`Starting transcoding job: ${jobId}`);

    // Fetch job details using service role (this function is only called internally)
    const { data: job, error: jobError } = await supabase
      .from("transcoding_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job not found");
    }

    // Update status to processing
    await supabase
      .from("transcoding_jobs")
      .update({ status: "processing", progress: 10 })
      .eq("id", jobId);

    console.log(`Processing job: ${job.original_filename}`);

    // PRODUCTION IMPLEMENTATION GUIDE:
    // For 25K concurrent transcodes handling 5TB+, you need:
    //
    // 1. DISTRIBUTED JOB QUEUE:
    //    - Use BullMQ/Redis for job queue management
    //    - Implement priority-based scheduling
    //    - Add retry logic and dead letter queues
    //
    // 2. WORKER INFRASTRUCTURE:
    //    - Kubernetes cluster with auto-scaling worker pods
    //    - Each worker runs FFmpeg in Docker containers
    //    - Scale based on queue depth (25K concurrent = ~500-1000 workers)
    //    - Use spot instances for cost optimization
    //
    // 3. MULTI-RESOLUTION TRANSCODING:
    //    FFmpeg command for adaptive streaming:
    //    ```bash
    //    ffmpeg -i input.mp4 \
    //      -c:v libx264 -crf 23 -preset fast \
    //      -c:a aac -b:a 128k \
    //      # 4K - 2160p
    //      -s 3840x2160 -b:v 20M -maxrate 22M -bufsize 44M -f hls \
    //      -hls_time 6 -hls_playlist_type vod -hls_segment_filename "2160p_%03d.ts" 2160p.m3u8 \
    //      # 1080p
    //      -s 1920x1080 -b:v 8M -maxrate 9M -bufsize 18M -f hls \
    //      -hls_time 6 -hls_playlist_type vod -hls_segment_filename "1080p_%03d.ts" 1080p.m3u8 \
    //      # 720p
    //      -s 1280x720 -b:v 5M -maxrate 6M -bufsize 12M -f hls \
    //      -hls_time 6 -hls_playlist_type vod -hls_segment_filename "720p_%03d.ts" 720p.m3u8 \
    //      # 480p
    //      -s 854x480 -b:v 2.5M -maxrate 3M -bufsize 6M -f hls \
    //      -hls_time 6 -hls_playlist_type vod -hls_segment_filename "480p_%03d.ts" 480p.m3u8 \
    //      # 360p
    //      -s 640x360 -b:v 1M -maxrate 1.2M -bufsize 2.4M -f hls \
    //      -hls_time 6 -hls_playlist_type vod -hls_segment_filename "360p_%03d.ts" 360p.m3u8
    //    ```
    //
    // 4. MASTER PLAYLIST GENERATION:
    //    Create master.m3u8 with all quality variants:
    //    ```
    //    #EXTM3U
    //    #EXT-X-STREAM-INF:BANDWIDTH=20000000,RESOLUTION=3840x2160
    //    2160p.m3u8
    //    #EXT-X-STREAM-INF:BANDWIDTH=8000000,RESOLUTION=1920x1080
    //    1080p.m3u8
    //    #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1280x720
    //    720p.m3u8
    //    #EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=854x480
    //    480p.m3u8
    //    #EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=640x360
    //    360p.m3u8
    //    ```
    //
    // 5. STORAGE ARCHITECTURE:
    //    - Use CDN (CloudFlare/CloudFront) in front of storage
    //    - Enable storage lifecycle policies for old content
    //    - Consider S3-compatible storage with multipart uploads
    //    - Implement storage tiering (hot/warm/cold)
    //
    // 6. MONITORING & OPTIMIZATION:
    //    - Track transcode time per resolution
    //    - Monitor worker utilization
    //    - Alert on failed jobs
    //    - Implement cost tracking per job

    // Update processing node (for distributed tracking)
    await supabase
      .from("transcoding_jobs")
      .update({ 
        status: "processing", 
        progress: 10,
        processing_node: Deno.env.get("DENO_REGION") || "edge-function"
      })
      .eq("id", jobId);

    // Simulate multi-resolution transcoding workflow
    const resolutions = [
      { name: "2160p", width: 3840, height: 2160, bitrate: 20000000 },
      { name: "1080p", width: 1920, height: 1080, bitrate: 8000000 },
      { name: "720p", width: 1280, height: 720, bitrate: 5000000 },
      { name: "480p", width: 854, height: 480, bitrate: 2500000 },
      { name: "360p", width: 640, height: 360, bitrate: 1000000 },
    ];

    const variants = [];
    let totalSize = 0;

    // Simulate processing each resolution
    for (let i = 0; i < resolutions.length; i++) {
      const res = resolutions[i];
      const progress = 20 + (i + 1) * (70 / resolutions.length);
      
      console.log(`Processing ${res.name}...`);
      
      // In production: transcode this resolution
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simulate file size (in bytes)
      const estimatedSize = Math.floor(Math.random() * 500000000 + 100000000);
      totalSize += estimatedSize;

      variants.push({
        resolution: res.name,
        width: res.width,
        height: res.height,
        bitrate: res.bitrate,
        url: `https://jemnukjewyzrelauapfp.supabase.co/storage/v1/object/public/transcoded-outputs/${job.user_id}/${job.id}/${res.name}.m3u8`,
        size_bytes: estimatedSize,
      });

      await supabase
        .from("transcoding_jobs")
        .update({ 
          progress: Math.floor(progress),
          resolution_variants: variants,
          total_size_bytes: totalSize
        })
        .eq("id", jobId);
    }

    // Generate master playlist URL
    const outputUrl = `https://jemnukjewyzrelauapfp.supabase.co/storage/v1/object/public/transcoded-outputs/${job.user_id}/${job.id}/master.m3u8`;

    await supabase
      .from("transcoding_jobs")
      .update({
        status: "completed",
        progress: 100,
        output_url: outputUrl,
        resolution_variants: variants,
        total_size_bytes: totalSize,
        estimated_duration: Math.floor((Date.now() - new Date(job.created_at).getTime()) / 1000),
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
      const bodyText = await req.text();
      const body = JSON.parse(bodyText);
      const jobId = body.jobId;
      
      if (jobId && UUID_REGEX.test(jobId)) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase
          .from("transcoding_jobs")
          .update({
            status: "failed",
            error_message: "Processing failed",
          })
          .eq("id", jobId);
      }
    } catch (updateError) {
      console.error("Failed to update job status:", updateError);
    }

    return new Response(
      JSON.stringify({
        error: "An error occurred during processing",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
