import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Simple in-memory rate limiting (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    // Create client with user context for ownership check
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Rate limiting: 10 requests per minute per user
    const now = Date.now();
    const userLimit = rateLimitMap.get(user.id);
    
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= 10) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        userLimit.count++;
      } else {
        rateLimitMap.set(user.id, { count: 1, resetTime: now + 60000 });
      }
    } else {
      rateLimitMap.set(user.id, { count: 1, resetTime: now + 60000 });
    }

    const { jobId } = await req.json();

    // Validate jobId format
    if (!jobId || typeof jobId !== "string") {
      throw new Error("Job ID is required");
    }

    if (!UUID_REGEX.test(jobId)) {
      throw new Error("Invalid job ID format");
    }

    // Verify job ownership using user context (RLS will apply)
    const { data: job, error: jobError } = await userClient
      .from("transcoding_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job not found or access denied");
    }

    console.log(`Starting transcode request for job: ${jobId}`);

    // Trigger the transcode function asynchronously using service role
    const transcodeUrl = `${supabaseUrl}/functions/v1/transcode`;
    
    // Start the background transcoding process (fire and forget)
    fetch(transcodeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ jobId }),
    }).catch(error => {
      console.error(`Failed to start transcode for job ${jobId}:`, error);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Transcoding started",
        jobId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Start transcode error:", error);

    const status = error.message === "Unauthorized" || error.message === "Job not found or access denied" 
      ? 401 
      : error.message === "Rate limit exceeded. Please try again later." 
      ? 429 
      : 400;

    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred. Please try again.",
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
