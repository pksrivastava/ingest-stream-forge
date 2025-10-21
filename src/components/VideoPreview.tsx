import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Download, 
  RefreshCw,
  FileVideo,
  Gauge,
  HardDrive,
  Clock,
  MonitorPlay
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import videojs from "video.js";
import "video.js/dist/video-js.css";

interface ResolutionVariant {
  resolution: string;
  width: number;
  height: number;
  bitrate: number;
  url: string;
  size_bytes: number;
}

interface VideoPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterUrl: string;
  variants: ResolutionVariant[];
  filename: string;
  totalSize: number;
  duration?: number;
}

export const VideoPreview = ({
  open,
  onOpenChange,
  masterUrl,
  variants,
  filename,
  totalSize,
  duration,
}: VideoPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<ResolutionVariant | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const { toast } = useToast();

  // Initialize Video.js player
  useEffect(() => {
    if (!videoRef.current || !open) return;

    const player = videojs(videoRef.current, {
      controls: false,
      autoplay: false,
      preload: "auto",
      fluid: true,
      responsive: true,
      sources: [
        {
          src: selectedVariant?.url || masterUrl,
          type: "application/x-mpegURL",
        },
      ],
    });

    playerRef.current = player;

    player.on("timeupdate", () => {
      setCurrentTime(player.currentTime() || 0);
    });

    player.on("loadedmetadata", () => {
      setVideoDuration(player.duration() || 0);
    });

    player.on("play", () => setIsPlaying(true));
    player.on("pause", () => setIsPlaying(false));

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [open, masterUrl, selectedVariant]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  };

  const handleSeek = (value: number[]) => {
    if (!playerRef.current) return;
    const time = value[0];
    playerRef.current.currentTime(time);
    setCurrentTime(time);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!playerRef.current) return;
    const vol = value[0];
    setVolume(vol);
    playerRef.current.volume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    playerRef.current.muted(newMuted);
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    if (playerRef.current.isFullscreen()) {
      playerRef.current.exitFullscreen();
    } else {
      playerRef.current.requestFullscreen();
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    if (!playerRef.current) return;
    setPlaybackSpeed(speed);
    playerRef.current.playbackRate(speed);
  };

  const switchResolution = (variant: ResolutionVariant) => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.currentTime();
    const wasPlaying = !playerRef.current.paused();

    setSelectedVariant(variant);
    playerRef.current.src({
      src: variant.url,
      type: "application/x-mpegURL",
    });

    playerRef.current.one("loadedmetadata", () => {
      playerRef.current.currentTime(currentTime);
      if (wasPlaying) {
        playerRef.current.play();
      }
    });

    toast({
      title: "Resolution changed",
      description: `Switched to ${variant.resolution}`,
    });
  };

  const downloadVariant = (variant: ResolutionVariant) => {
    window.open(variant.url, "_blank");
    toast({
      title: "Download started",
      description: `Downloading ${variant.resolution} version`,
    });
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatBitrate = (bitrate: number) => {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileVideo className="w-5 h-5" />
            {filename}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="player" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="player">Player</TabsTrigger>
            <TabsTrigger value="resolutions">Resolutions</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          {/* Player Tab */}
          <TabsContent value="player" className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="video-js vjs-big-play-centered w-full"
                playsInline
              />
            </div>

            {/* Custom Controls */}
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <Slider
                    value={[currentTime]}
                    max={videoDuration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(videoDuration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={togglePlay}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={toggleMute}
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        max={1}
                        step={0.1}
                        onValueChange={handleVolumeChange}
                        className="w-24"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Playback Speed */}
                    <div className="flex gap-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                        <Button
                          key={speed}
                          size="sm"
                          variant={playbackSpeed === speed ? "default" : "outline"}
                          onClick={() => changePlaybackSpeed(speed)}
                        >
                          {speed}x
                        </Button>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleFullscreen}
                    >
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Current Resolution */}
                {selectedVariant && (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <MonitorPlay className="w-4 h-4" />
                    <span>Playing: {selectedVariant.resolution}</span>
                    <Badge variant="secondary">
                      {selectedVariant.width}x{selectedVariant.height}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resolutions Tab */}
          <TabsContent value="resolutions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {variants.map((variant) => (
                <Card
                  key={variant.resolution}
                  className={`cursor-pointer transition-all ${
                    selectedVariant?.resolution === variant.resolution
                      ? "ring-2 ring-primary"
                      : "hover:shadow-lg"
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg">{variant.resolution}</span>
                      <Badge variant="outline">
                        {variant.width}x{variant.height}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <span>{formatBitrate(variant.bitrate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-muted-foreground" />
                        <span>{formatBytes(variant.size_bytes)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => switchResolution(variant)}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Play
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => downloadVariant(variant)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Master Playlist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Adaptive Streaming (Master Playlist)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  The master playlist automatically selects the best quality based on network conditions.
                  All resolution variants are included for adaptive bitrate streaming.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedVariant(null);
                      if (playerRef.current) {
                        playerRef.current.src({
                          src: masterUrl,
                          type: "application/x-mpegURL",
                        });
                      }
                    }}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Use Adaptive Streaming
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.open(masterUrl, "_blank");
                      toast({
                        title: "Master playlist opened",
                        description: "Opened in new tab",
                      });
                    }}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    View M3U8
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>File Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileVideo className="w-4 h-4" />
                      <span className="text-sm font-medium">Original Filename</span>
                    </div>
                    <p className="text-sm">{filename}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <HardDrive className="w-4 h-4" />
                      <span className="text-sm font-medium">Total Size</span>
                    </div>
                    <p className="text-sm">{formatBytes(totalSize)}</p>
                  </div>

                  {duration && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Processing Time</span>
                      </div>
                      <p className="text-sm">{duration}s</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MonitorPlay className="w-4 h-4" />
                      <span className="text-sm font-medium">Format</span>
                    </div>
                    <p className="text-sm">HLS (HTTP Live Streaming)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resolution Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {variants.map((variant) => (
                    <div
                      key={variant.resolution}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <Badge>{variant.resolution}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {variant.width}x{variant.height}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{formatBitrate(variant.bitrate)}</span>
                        <span className="text-muted-foreground">
                          {formatBytes(variant.size_bytes)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Streaming URLs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Master Playlist (Adaptive)</p>
                  <code className="block p-2 text-xs bg-muted rounded overflow-x-auto">
                    {masterUrl}
                  </code>
                </div>
                {variants.map((variant) => (
                  <div key={variant.resolution} className="space-y-2">
                    <p className="text-sm font-medium">{variant.resolution} Direct</p>
                    <code className="block p-2 text-xs bg-muted rounded overflow-x-auto">
                      {variant.url}
                    </code>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
