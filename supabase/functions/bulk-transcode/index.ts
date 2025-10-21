import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    const user = userData?.user;

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const jobIds = body?.jobIds as string[] | undefined;

    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return new Response(JSON.stringify({ error: "Job IDs array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (jobIds.length > 100) {
      return new Response(JSON.stringify({ error: "Maximum 100 jobs per batch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate all job IDs
    for (const jobId of jobIds) {
      if (!UUID_REGEX.test(jobId)) {
        return new Response(JSON.stringify({ error: `Invalid job ID format: ${jobId}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Verify all jobs belong to user and are pending
    const { data: jobs, error: jobError } = await userClient
      .from("transcoding_jobs")
      .select("id,status")
      .in("id", jobIds);

    if (jobError || !jobs || jobs.length !== jobIds.length) {
      return new Response(JSON.stringify({ error: "One or more jobs not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nonPendingJobs = jobs.filter(j => j.status !== "pending");
    if (nonPendingJobs.length > 0) {
      return new Response(JSON.stringify({ 
        error: "All jobs must be pending", 
        nonPendingJobs: nonPendingJobs.map(j => j.id) 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`bulk-transcode: user=${user.id} processing ${jobIds.length} jobs`);

    const transcodeUrl = `${supabaseUrl}/functions/v1/transcode`;
    const results = [];

    // Trigger all transcoding jobs
    for (const jobId of jobIds) {
      const kickOff = fetch(transcodeUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ jobId }),
      }).then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          console.error(`transcode call failed for ${jobId}:`, res.status, msg);
          return { jobId, success: false, error: msg };
        }
        return { jobId, success: true };
      }).catch((e) => {
        console.error(`transcode call error for ${jobId}:`, e);
        return { jobId, success: false, error: e.message };
      });

      results.push(kickOff);
    }

    // Wait for all to complete
    const outcomes = await Promise.all(results);

    const successful = outcomes.filter(o => o.success).length;
    const failed = outcomes.filter(o => !o.success);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Bulk transcoding started: ${successful} succeeded, ${failed.length} failed`,
        total: jobIds.length,
        successful,
        failed: failed.length,
        failedJobs: failed
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("bulk-transcode fatal error:", err);
    return new Response(JSON.stringify({ error: "Unexpected server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
