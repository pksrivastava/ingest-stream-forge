import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Auth = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Media Transcoder
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to start transcoding your media files to HLS/DASH
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "hsl(240 100% 65%)",
                    brandAccent: "hsl(270 100% 70%)",
                  },
                },
              },
              className: {
                container: "space-y-4",
                button: "bg-primary hover:bg-primary/90 text-primary-foreground",
                input: "bg-input border-border",
              },
            }}
            providers={[]}
          />
        </CardContent>
      </Card>
    </div>
  );
};
