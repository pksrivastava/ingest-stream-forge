import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { FileUpload } from "@/components/FileUpload";
import { BulkUpload } from "@/components/BulkUpload";
import { JobQueue } from "@/components/JobQueue";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent animate-gradient">
              Media Transcoder
            </h1>
            <p className="text-muted-foreground mt-2">
              Convert your media files to HLS/DASH for streaming
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/developer")}>
              <Code className="w-4 h-4 mr-2" />
              Developer Portal
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Upload</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="single" className="mt-6">
            <FileUpload onUploadComplete={() => setRefreshKey((prev) => prev + 1)} />
          </TabsContent>
          <TabsContent value="bulk" className="mt-6">
            <BulkUpload onUploadComplete={() => setRefreshKey((prev) => prev + 1)} />
          </TabsContent>
        </Tabs>

        {/* Job Queue */}
        <JobQueue key={refreshKey} />

        {/* GCP Deployment Info */}
        <div className="mt-12 p-6 rounded-lg border bg-card/50 backdrop-blur">
          <h2 className="text-2xl font-semibold mb-4">GCP Deployment Guide</h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Architecture Overview</h3>
              <p>
                This transcoder is built with Lovable Cloud backend and can be integrated with GCP Media CDN:
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-2">1. Storage Setup</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Source files are stored in Lovable Cloud Storage</li>
                <li>Transcoded outputs (HLS/DASH) can be exported to GCP Storage buckets</li>
                <li>Configure bucket policies for public streaming access</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">2. Media CDN Integration</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Connect your GCP Storage bucket to Media CDN</li>
                <li>Configure CDN caching policies for HLS/DASH segments</li>
                <li>Set up appropriate CORS headers for streaming</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">3. Transcoding Pipeline</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Backend functions handle transcoding using FFmpeg</li>
                <li>Jobs are queued and processed asynchronously</li>
                <li>Real-time status updates via WebSocket connections</li>
                <li>Output files are automatically organized in streaming-ready format</li>
              </ul>
            </div>

            <div className="mt-4 p-4 rounded bg-primary/5 border border-primary/20">
              <p className="text-foreground">
                <strong>Note:</strong> For production deployment, configure backend functions to export
                transcoded files directly to your GCP bucket, then serve via Media CDN for optimal performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
