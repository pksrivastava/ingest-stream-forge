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

    console.log(`Starting transcode request for job: ${jobId}`);

    // Trigger the transcode function asynchronously
    const transcodeUrl = `${supabaseUrl}/functions/v1/transcode`;
    
    // Start the background transcoding process (fire and forget)
    fetch(transcodeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
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

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to start transcoding",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
