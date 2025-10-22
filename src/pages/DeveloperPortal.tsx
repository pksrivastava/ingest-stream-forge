import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Code, 
  Book, 
  Webhook, 
  Key, 
  Database, 
  ArrowLeft,
  Copy,
  Check,
  FileCode,
  Terminal,
  Cloud,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function DeveloperPortal() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied to clipboard",
      description: label,
    });
  };

  const baseUrl = window.location.origin;
  const apiBaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to App
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Code className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">Developer Portal</h1>
              </div>
            </div>
            <Badge variant="secondary">API v1.0</Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="w-5 h-5" />
                API Overview
              </CardTitle>
              <CardDescription>
                Enterprise-grade video transcoding API with HLS/DASH output and GCP Media CDN integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Multi-Resolution</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatic transcoding to 360p, 480p, 720p, 1080p, and 4K
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">CDN Ready</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Optimized for GCP Media CDN with adaptive bitrate streaming
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Webhook className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Real-time Updates</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    WebSocket support for live progress tracking
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Documentation Tabs */}
          <Tabs defaultValue="quickstart" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
              <TabsTrigger value="authentication">Auth</TabsTrigger>
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="gcp">GCP Setup</TabsTrigger>
              <TabsTrigger value="postman">Postman</TabsTrigger>
            </TabsList>

            {/* Quick Start */}
            <TabsContent value="quickstart" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Start Guide</CardTitle>
                  <CardDescription>Get started with the Transcoding API in minutes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">1. Authentication</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Sign up and obtain your API credentials:
                    </p>
                    <CodeBlock
                      language="bash"
                      code={`curl -X POST ${apiBaseUrl}/auth/v1/signup \\
  -H "Content-Type: application/json" \\
  -H "apikey: YOUR_API_KEY" \\
  -d '{
    "email": "developer@example.com",
    "password": "secure_password"
  }'`}
                      onCopy={() => copyToClipboard(`curl -X POST ${apiBaseUrl}/auth/v1/signup`, "Authentication example")}
                      copied={copiedCode === "Authentication example"}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">2. Upload Media File</h3>
                    <CodeBlock
                      language="bash"
                      code={`curl -X POST "${apiBaseUrl}/storage/v1/object/source-files/USER_ID/video.mp4" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "apikey: YOUR_API_KEY" \\
  -F "file=@/path/to/video.mp4"`}
                      onCopy={() => copyToClipboard("Upload example", "Upload example")}
                      copied={copiedCode === "Upload example"}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">3. Create Transcoding Job</h3>
                    <CodeBlock
                      language="bash"
                      code={`curl -X POST ${apiBaseUrl}/rest/v1/transcoding_jobs \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "apikey: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input_file_url": "https://your-storage-url.com/video.mp4",
    "output_format": "hls",
    "original_filename": "video.mp4"
  }'`}
                      onCopy={() => copyToClipboard("Create job example", "Create job example")}
                      copied={copiedCode === "Create job example"}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">4. Start Transcoding</h3>
                    <CodeBlock
                      language="bash"
                      code={`curl -X POST ${apiBaseUrl}/functions/v1/start-transcode \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "apikey: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jobId": "your-job-id"}'`}
                      onCopy={() => copyToClipboard("Start transcode example", "Start transcode example")}
                      copied={copiedCode === "Start transcode example"}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Authentication */}
            <TabsContent value="authentication" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Authentication
                  </CardTitle>
                  <CardDescription>Secure your API requests with JWT tokens</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Base URL</h3>
                    <CodeBlock
                      language="text"
                      code={apiBaseUrl}
                      onCopy={() => copyToClipboard(apiBaseUrl, "Base URL")}
                      copied={copiedCode === "Base URL"}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Authentication Flow</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-2">
                      <li>Sign up or sign in to obtain a JWT token</li>
                      <li>Include the token in the Authorization header</li>
                      <li>Tokens expire after 1 hour - refresh as needed</li>
                      <li>Use the apikey header for all requests</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Sign In</h3>
                    <CodeBlock
                      language="bash"
                      code={`curl -X POST ${apiBaseUrl}/auth/v1/token?grant_type=password \\
  -H "Content-Type: application/json" \\
  -H "apikey: YOUR_API_KEY" \\
  -d '{
    "email": "developer@example.com",
    "password": "your_password"
  }'

# Response:
{
  "access_token": "eyJhbG...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "..."
}`}
                      onCopy={() => copyToClipboard("Sign in example", "Sign in example")}
                      copied={copiedCode === "Sign in example"}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Using the Token</h3>
                    <CodeBlock
                      language="bash"
                      code={`# Include in every authenticated request:
Authorization: Bearer YOUR_JWT_TOKEN
apikey: YOUR_API_KEY`}
                      onCopy={() => copyToClipboard("Token usage", "Token usage")}
                      copied={copiedCode === "Token usage"}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Endpoints */}
            <TabsContent value="endpoints" className="space-y-4">
              <EndpointCard
                method="POST"
                path="/storage/v1/object/source-files/{userId}/{filename}"
                title="Upload Source File"
                description="Upload a video or audio file for transcoding"
                request={`Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  apikey: YOUR_API_KEY
  
Body (multipart/form-data):
  file: [binary file data]`}
                response={`{
  "Key": "source-files/user-id/filename.mp4",
  "Id": "unique-file-id"
}`}
                onCopy={copyToClipboard}
                copiedCode={copiedCode}
              />

              <EndpointCard
                method="POST"
                path="/rest/v1/transcoding_jobs"
                title="Create Transcoding Job"
                description="Create a new transcoding job for uploaded media"
                request={`Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  apikey: YOUR_API_KEY
  Content-Type: application/json
  Prefer: return=representation
  
Body:
{
  "input_file_url": "https://storage-url/video.mp4",
  "output_format": "hls",
  "original_filename": "video.mp4",
  "priority": 5
}`}
                response={`{
  "id": "job-uuid",
  "user_id": "user-uuid",
  "status": "pending",
  "progress": 0,
  "original_filename": "video.mp4",
  "input_file_url": "https://...",
  "output_format": "hls",
  "created_at": "2025-01-01T00:00:00Z"
}`}
                onCopy={copyToClipboard}
                copiedCode={copiedCode}
              />

              <EndpointCard
                method="POST"
                path="/functions/v1/start-transcode"
                title="Start Transcoding"
                description="Trigger the transcoding process for a job"
                request={`Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  apikey: YOUR_API_KEY
  Content-Type: application/json
  
Body:
{
  "jobId": "job-uuid"
}`}
                response={`{
  "success": true,
  "message": "Transcoding started",
  "jobId": "job-uuid"
}`}
                onCopy={copyToClipboard}
                copiedCode={copiedCode}
              />

              <EndpointCard
                method="POST"
                path="/functions/v1/bulk-transcode"
                title="Bulk Transcode"
                description="Start multiple transcoding jobs at once (max 100)"
                request={`Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  apikey: YOUR_API_KEY
  Content-Type: application/json
  
Body:
{
  "jobIds": ["job-uuid-1", "job-uuid-2", "job-uuid-3"]
}`}
                response={`{
  "success": true,
  "results": {
    "succeeded": 3,
    "failed": 0
  }
}`}
                onCopy={copyToClipboard}
                copiedCode={copiedCode}
              />

              <EndpointCard
                method="GET"
                path="/rest/v1/transcoding_jobs?id=eq.{jobId}"
                title="Get Job Status"
                description="Retrieve status and details of a specific job"
                request={`Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  apikey: YOUR_API_KEY`}
                response={`{
  "id": "job-uuid",
  "status": "completed",
  "progress": 100,
  "output_url": "https://cdn-url/master.m3u8",
  "resolution_variants": [
    {
      "resolution": "1080p",
      "width": 1920,
      "height": 1080,
      "bitrate": 8000000,
      "url": "https://cdn-url/1080p.m3u8",
      "size_bytes": 409774446
    }
  ],
  "total_size_bytes": 1198082256,
  "estimated_duration": 9
}`}
                onCopy={copyToClipboard}
                copiedCode={copiedCode}
              />

              <EndpointCard
                method="DELETE"
                path="/rest/v1/transcoding_jobs?id=eq.{jobId}"
                title="Delete Job"
                description="Delete a transcoding job and its data"
                request={`Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  apikey: YOUR_API_KEY`}
                response={`204 No Content`}
                onCopy={copyToClipboard}
                copiedCode={copiedCode}
              />
            </TabsContent>

            {/* Webhooks */}
            <TabsContent value="webhooks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5" />
                    Real-time Updates
                  </CardTitle>
                  <CardDescription>Subscribe to job status changes via WebSockets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">WebSocket Connection</h3>
                    <CodeBlock
                      language="javascript"
                      code={`import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  '${apiBaseUrl}',
  'YOUR_API_KEY'
);

// Subscribe to transcoding job updates
const channel = supabase
  .channel('transcoding-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'transcoding_jobs',
      filter: 'user_id=eq.YOUR_USER_ID'
    },
    (payload) => {
      console.log('Job updated:', payload.new);
      
      if (payload.new.status === 'completed') {
        console.log('Transcoding complete!');
        console.log('Output URL:', payload.new.output_url);
      }
    }
  )
  .subscribe();`}
                      onCopy={() => copyToClipboard("WebSocket example", "WebSocket example")}
                      copied={copiedCode === "WebSocket example"}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Event Types</h3>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge>INSERT</Badge>
                          <span className="font-medium">Job Created</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Fired when a new job is created</p>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge>UPDATE</Badge>
                          <span className="font-medium">Job Updated</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Fired on progress updates (status, progress percentage)</p>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge>DELETE</Badge>
                          <span className="font-medium">Job Deleted</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Fired when a job is removed</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* GCP Setup */}
            <TabsContent value="gcp" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    GCP Integration Guide
                  </CardTitle>
                  <CardDescription>
                    Production deployment with GCP Transcoder API and Media CDN
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h3 className="font-semibold mb-2">Architecture Overview</h3>
                    <pre className="text-xs overflow-x-auto">
{`Client Upload → Lovable Storage → Webhook → GCP Transcoder
                                          ↓
                                    GCS Bucket
                                          ↓
                                    Media CDN → End Users`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Step 1: Enable GCP Services</h3>
                    <CodeBlock
                      language="bash"
                      code={`# Enable required APIs
gcloud services enable transcoder.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cdn.googleapis.com

# Create service account
gcloud iam service-accounts create transcoder-service \\
  --display-name="Transcoder Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding PROJECT_ID \\
  --member="serviceAccount:transcoder-service@PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/transcoder.admin"

# Create key
gcloud iam service-accounts keys create key.json \\
  --iam-account=transcoder-service@PROJECT_ID.iam.gserviceaccount.com`}
                      onCopy={() => copyToClipboard("GCP setup", "GCP setup commands")}
                      copied={copiedCode === "GCP setup commands"}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Step 2: Configure Storage Bucket</h3>
                    <CodeBlock
                      language="bash"
                      code={`# Create bucket for transcoded outputs
gsutil mb -p PROJECT_ID -c STANDARD -l us-central1 gs://transcoded-media

# Enable uniform bucket access
gsutil uniformbucketlevelaccess set on gs://transcoded-media

# Make publicly readable for streaming
gsutil iam ch allUsers:objectViewer gs://transcoded-media

# Set CORS for HLS/DASH streaming
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Range"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://transcoded-media`}
                      onCopy={() => copyToClipboard("Storage setup", "Storage setup commands")}
                      copied={copiedCode === "Storage setup commands"}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Step 3: Set Up Media CDN</h3>
                    <CodeBlock
                      language="bash"
                      code={`# Create backend bucket
gcloud compute backend-buckets create transcoded-backend \\
  --gcs-bucket-name=transcoded-media \\
  --enable-cdn

# Configure cache settings
gcloud compute backend-buckets update transcoded-backend \\
  --cache-mode=CACHE_ALL_STATIC \\
  --default-ttl=3600 \\
  --max-ttl=86400 \\
  --client-ttl=3600

# Create URL map
gcloud compute url-maps create transcoder-cdn-map \\
  --default-backend-bucket=transcoded-backend

# Create HTTP(S) proxy
gcloud compute target-http-proxies create transcoder-http-proxy \\
  --url-map=transcoder-cdn-map

# Create forwarding rule
gcloud compute forwarding-rules create transcoder-cdn-rule \\
  --global \\
  --target-http-proxy=transcoder-http-proxy \\
  --ports=80`}
                      onCopy={() => copyToClipboard("CDN setup", "CDN setup commands")}
                      copied={copiedCode === "CDN setup commands"}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Step 4: Webhook Integration</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Create a webhook endpoint to receive GCP Transcoder job notifications:
                    </p>
                    <CodeBlock
                      language="typescript"
                      code={`// supabase/functions/gcp-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify GCP signature (important for security)
  const signature = req.headers.get("X-Goog-Signature");
  // Implement signature verification here

  const event = await req.json();
  
  if (event.type === "transcoding.job.completed") {
    const jobId = event.metadata.jobId;
    const outputUrls = event.outputUrls;

    // Update job in database
    await supabase
      .from("transcoding_jobs")
      .update({
        status: "completed",
        progress: 100,
        output_url: outputUrls.master,
        resolution_variants: outputUrls.variants
      })
      .eq("id", jobId);
  }

  return new Response("OK", { status: 200 });
});`}
                      onCopy={() => copyToClipboard("Webhook code", "Webhook code")}
                      copied={copiedCode === "Webhook code"}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Postman Collection */}
            <TabsContent value="postman" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="w-5 h-5" />
                    Postman Collection
                  </CardTitle>
                  <CardDescription>Import this collection to test all API endpoints</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">Download Collection</h3>
                    <Button
                      onClick={() => {
                        const collection = generatePostmanCollection(apiBaseUrl);
                        const blob = new Blob([JSON.stringify(collection, null, 2)], {
                          type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "transcoding-api.postman_collection.json";
                        a.click();
                        toast({
                          title: "Collection downloaded",
                          description: "Import into Postman to get started",
                        });
                      }}
                    >
                      <Terminal className="w-4 h-4 mr-2" />
                      Download Postman Collection
                    </Button>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Environment Variables</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Set these variables in your Postman environment:
                    </p>
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg border font-mono text-sm">
                        <span className="text-muted-foreground">base_url:</span> {apiBaseUrl}
                      </div>
                      <div className="p-3 rounded-lg border font-mono text-sm">
                        <span className="text-muted-foreground">api_key:</span> YOUR_API_KEY
                      </div>
                      <div className="p-3 rounded-lg border font-mono text-sm">
                        <span className="text-muted-foreground">jwt_token:</span> YOUR_JWT_TOKEN
                      </div>
                      <div className="p-3 rounded-lg border font-mono text-sm">
                        <span className="text-muted-foreground">user_id:</span> YOUR_USER_ID
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Quick Import Instructions</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-2">
                      <li>Download the collection JSON file</li>
                      <li>Open Postman and click "Import" in the top left</li>
                      <li>Drag and drop the downloaded file</li>
                      <li>Create a new environment with the variables above</li>
                      <li>Select the environment and start making requests</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Additional Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="https://cloud.google.com/transcoder/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <h3 className="font-semibold mb-2">GCP Transcoder API Docs</h3>
                  <p className="text-sm text-muted-foreground">
                    Official documentation for GCP Transcoder API
                  </p>
                </a>
                <a
                  href="https://datatracker.ietf.org/doc/html/rfc8216"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <h3 className="font-semibold mb-2">HLS Specification</h3>
                  <p className="text-sm text-muted-foreground">
                    RFC 8216 - HTTP Live Streaming protocol specification
                  </p>
                </a>
                <a
                  href="https://dashif.org/docs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <h3 className="font-semibold mb-2">DASH Specification</h3>
                  <p className="text-sm text-muted-foreground">
                    DASH Industry Forum documentation and guidelines
                  </p>
                </a>
                <a
                  href="https://ffmpeg.org/documentation.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <h3 className="font-semibold mb-2">FFmpeg Documentation</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete FFmpeg command reference and guides
                  </p>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper Components
interface CodeBlockProps {
  language: string;
  code: string;
  onCopy: (text: string, label: string) => void;
  copied: boolean;
}

function CodeBlock({ language, code, onCopy, copied }: CodeBlockProps) {
  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onCopy(code, `${language} code`)}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}

interface EndpointCardProps {
  method: string;
  path: string;
  title: string;
  description: string;
  request: string;
  response: string;
  onCopy: (text: string, label: string) => void;
  copiedCode: string | null;
}

function EndpointCard({
  method,
  path,
  title,
  description,
  request,
  response,
  onCopy,
  copiedCode,
}: EndpointCardProps) {
  const methodColor = {
    GET: "bg-blue-500",
    POST: "bg-green-500",
    PUT: "bg-yellow-500",
    DELETE: "bg-red-500",
  }[method] || "bg-gray-500";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <Badge className={`${methodColor} text-white`}>{method}</Badge>
          <code className="text-sm">{path}</code>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Request</h4>
          <CodeBlock
            language="http"
            code={request}
            onCopy={onCopy}
            copied={copiedCode === `${title} request`}
          />
        </div>
        <div>
          <h4 className="font-semibold mb-2">Response</h4>
          <CodeBlock
            language="json"
            code={response}
            onCopy={onCopy}
            copied={copiedCode === `${title} response`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function generatePostmanCollection(baseUrl: string) {
  return {
    info: {
      name: "Media Transcoding API",
      description: "Complete API collection for video transcoding platform",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      { key: "base_url", value: baseUrl },
      { key: "api_key", value: "YOUR_API_KEY" },
      { key: "jwt_token", value: "YOUR_JWT_TOKEN" },
      { key: "user_id", value: "YOUR_USER_ID" },
    ],
    item: [
      {
        name: "Authentication",
        item: [
          {
            name: "Sign Up",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "apikey", value: "{{api_key}}" },
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  email: "developer@example.com",
                  password: "secure_password",
                }),
              },
              url: {
                raw: "{{base_url}}/auth/v1/signup",
                host: ["{{base_url}}"],
                path: ["auth", "v1", "signup"],
              },
            },
          },
          {
            name: "Sign In",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                { key: "apikey", value: "{{api_key}}" },
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  email: "developer@example.com",
                  password: "your_password",
                }),
              },
              url: {
                raw: "{{base_url}}/auth/v1/token?grant_type=password",
                host: ["{{base_url}}"],
                path: ["auth", "v1", "token"],
                query: [{ key: "grant_type", value: "password" }],
              },
            },
          },
        ],
      },
      {
        name: "Transcoding",
        item: [
          {
            name: "Create Job",
            request: {
              method: "POST",
              header: [
                { key: "Authorization", value: "Bearer {{jwt_token}}" },
                { key: "apikey", value: "{{api_key}}" },
                { key: "Content-Type", value: "application/json" },
                { key: "Prefer", value: "return=representation" },
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  input_file_url: "https://storage-url/video.mp4",
                  output_format: "hls",
                  original_filename: "video.mp4",
                }),
              },
              url: {
                raw: "{{base_url}}/rest/v1/transcoding_jobs",
                host: ["{{base_url}}"],
                path: ["rest", "v1", "transcoding_jobs"],
              },
            },
          },
          {
            name: "Start Transcode",
            request: {
              method: "POST",
              header: [
                { key: "Authorization", value: "Bearer {{jwt_token}}" },
                { key: "apikey", value: "{{api_key}}" },
                { key: "Content-Type", value: "application/json" },
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  jobId: "job-uuid",
                }),
              },
              url: {
                raw: "{{base_url}}/functions/v1/start-transcode",
                host: ["{{base_url}}"],
                path: ["functions", "v1", "start-transcode"],
              },
            },
          },
          {
            name: "Get Job Status",
            request: {
              method: "GET",
              header: [
                { key: "Authorization", value: "Bearer {{jwt_token}}" },
                { key: "apikey", value: "{{api_key}}" },
              ],
              url: {
                raw: "{{base_url}}/rest/v1/transcoding_jobs?id=eq.JOB_ID&select=*",
                host: ["{{base_url}}"],
                path: ["rest", "v1", "transcoding_jobs"],
                query: [
                  { key: "id", value: "eq.JOB_ID" },
                  { key: "select", value: "*" },
                ],
              },
            },
          },
          {
            name: "Bulk Transcode",
            request: {
              method: "POST",
              header: [
                { key: "Authorization", value: "Bearer {{jwt_token}}" },
                { key: "apikey", value: "{{api_key}}" },
                { key: "Content-Type", value: "application/json" },
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  jobIds: ["job-uuid-1", "job-uuid-2"],
                }),
              },
              url: {
                raw: "{{base_url}}/functions/v1/bulk-transcode",
                host: ["{{base_url}}"],
                path: ["functions", "v1", "bulk-transcode"],
              },
            },
          },
        ],
      },
    ],
  };
}
