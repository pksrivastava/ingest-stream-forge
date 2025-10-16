import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Simple in-memory rate limiter (per user)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

serve(async (req) => {
  try {
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("Missing required environment variables");
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

    // User client with incoming JWT (RLS enforced)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Extract raw JWT and verify explicitly to avoid server-context session issues
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) {
      console.error("Auth getUser failed:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 10 req/min per user
    const now = Date.now();
    const rl = rateLimitMap.get(user.id);
    if (rl) {
      if (now < rl.resetTime) {
        if (rl.count >= 10) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        rl.count++;
      } else {
        rateLimitMap.set(user.id, { count: 1, resetTime: now + 60_000 });
      }
    } else {
      rateLimitMap.set(user.id, { count: 1, resetTime: now + 60_000 });
    }

    // Parse body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobId = body?.jobId as string | undefined;
    if (!jobId) {
      return new Response(JSON.stringify({ error: "Job ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!UUID_REGEX.test(jobId)) {
      return new Response(JSON.stringify({ error: "Invalid job ID format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ownership + status check (RLS ensures user_id = auth.uid())
    const { data: job, error: jobError } = await userClient
      .from("transcoding_jobs")
      .select("id,status")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.status !== "pending") {
      return new Response(JSON.stringify({ error: `Job is not pending (current: ${job.status})` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`start-transcode: user=${user.id} job=${jobId} triggering transcode`);

    const transcodeUrl = `${supabaseUrl}/functions/v1/transcode`;

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
        console.error("transcode call failed:", res.status, msg);
      }
    }).catch((e) => console.error("transcode call error:", e));

    // Fire-and-forget if supported
    // deno-lint-ignore no-explicit-any
    const anyGlobal: any = globalThis as any;
    if (anyGlobal?.EdgeRuntime?.waitUntil) {
      anyGlobal.EdgeRuntime.waitUntil(kickOff);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Transcoding started", jobId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("start-transcode fatal error:", err);
    return new Response(JSON.stringify({ error: "Unexpected server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});