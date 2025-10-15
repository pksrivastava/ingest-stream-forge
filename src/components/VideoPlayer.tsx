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

    // Set the source
    player.src({
      src: src,
      type: type === "hls" ? "application/x-mpegURL" : "application/dash+xml",
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

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div data-vjs-player>
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered vjs-theme-city"
        />
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        <p>Adaptive streaming enabled - quality will adjust automatically based on bandwidth</p>
      </div>
    </div>
  );
};
