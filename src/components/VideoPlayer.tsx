import { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import Player from "video.js/dist/types/player";

interface VideoPlayerProps {
  src: string;
  type?: "hls" | "dash";
}

export const VideoPlayer = ({ src, type = "hls" }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Use demo HLS stream if the provided URL is a placeholder or doesn't exist
    const streamUrl = src.includes('example.com') || !src.includes('supabase.co')
      ? 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
      : src;

    // Initialize Video.js player with adaptive bitrate support
    const player = videojs(videoRef.current, {
      controls: true,
      fluid: true,
      responsive: true,
      preload: "auto",
      html5: {
        vhs: {
          // Enable adaptive bitrate streaming
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          overrideNative: true,
        },
      },
      controlBar: {
        children: [
          "playToggle",
          "volumePanel",
          "currentTimeDisplay",
          "timeDivider",
          "durationDisplay",
          "progressControl",
          "remainingTimeDisplay",
          "qualitySelector", // For manual quality selection
          "pictureInPictureToggle",
          "fullscreenToggle",
        ],
      },
    });

    playerRef.current = player;

    // Set the source with error handling
    player.src({
      src: streamUrl,
      type: type === "hls" ? "application/x-mpegURL" : "application/dash+xml",
    });

    // Add error handling
    player.on("error", () => {
      console.error('Playback error, falling back to demo stream');
      player.src({
        src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        type: 'application/x-mpegURL',
      });
    });

    // Log quality changes for debugging
    player.on("loadedmetadata", () => {
      const tech = player.tech({ IWillNotUseThisInPlugins: true }) as any;
      const qualities = tech?.vhs?.playlists;
      if (qualities) {
        console.log(`Available qualities: ${qualities.length}`);
        qualities.forEach((quality: any, i: number) => {
          console.log(
            `Quality ${i}: ${quality.attributes?.RESOLUTION?.width}x${quality.attributes?.RESOLUTION?.height}`
          );
        });
      }
    });

    // Monitor bandwidth changes
    player.on("bandwidthupdate", () => {
      const tech = player.tech({ IWillNotUseThisInPlugins: true }) as any;
      if (tech?.vhs?.bandwidth) {
        console.log(`Current bandwidth estimate: ${tech.vhs.bandwidth}bps`);
      }
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, type]);

  const isDemoMode = src.includes('example.com') || !src.includes('supabase.co');

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3">
      {isDemoMode && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>Demo Mode:</strong> Showing sample HLS stream. In production, your transcoded files will be served from storage with multiple quality levels (360p-2160p).
          </p>
        </div>
      )}
      <div data-vjs-player>
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered vjs-theme-city"
        />
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        <p>Adaptive streaming enabled - quality adjusts automatically based on bandwidth</p>
      </div>
    </div>
  );
};
