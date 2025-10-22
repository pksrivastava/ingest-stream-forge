import { useEffect, useMemo, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Maximize } from "lucide-react";

const getParam = (key: string) => new URLSearchParams(window.location.search).get(key) || "";
const getMimeType = (url: string) => {
  const lower = url.toLowerCase();
  if (lower.endsWith(".m3u8")) return "application/x-mpegURL";
  if (lower.endsWith(".mp4") || lower.endsWith(".mov")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mkv")) return "video/x-matroska";
  return "application/x-mpegURL";
};

export default function SharePreview() {
  const src = useMemo(() => decodeURIComponent(getParam("src")), []);
  const title = useMemo(() => decodeURIComponent(getParam("title") || "Shared Preview"), []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!videoRef.current || !src) return;

    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: "auto",
      fluid: true,
      responsive: true,
      sources: [{ src, type: getMimeType(src) }],
    });

    playerRef.current = player;

    player.on("play", () => setIsPlaying(true));
    player.on("pause", () => setIsPlaying(false));

    document.title = `${title} – Preview`;

    return () => {
      if (player && !player.isDisposed()) player.dispose();
    };
  }, [src, title]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pause();
    else playerRef.current.play();
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    if (playerRef.current.isFullscreen()) playerRef.current.exitFullscreen();
    else playerRef.current.requestFullscreen();
  };

  if (!src) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Missing or invalid source URL.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold truncate">{title}</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={togglePlay}>
              {isPlaying ? <Pause className="w-4 h-4 mr-1"/> : <Play className="w-4 h-4 mr-1"/>}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button size="sm" variant="outline" onClick={toggleFullscreen}>
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="rounded-lg overflow-hidden bg-black">
          <video ref={videoRef} className="video-js vjs-big-play-centered w-full" playsInline />
        </div>

        <section className="text-sm text-muted-foreground">
          <p>
            Share this link to allow anyone to preview the media without signing in.
          </p>
        </section>
      </div>
    </main>
  );
}
