import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export type HlsOutput = {
  files: Record<string, Uint8Array>;
  masterName: string;
  variantName: string;
  resolution: { width: number; height: number; label: string };
  approxBitrate: number;
};

export async function getFFmpeg(log = false) {
  if (!ffmpeg) ffmpeg = new FFmpeg();
  if (!ffmpeg.loaded) {
    if (log) ffmpeg.on('log', ({ message }) => console.log('[ffmpeg]', message));
    const coreVersion = '0.12.7';
    const baseURL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${coreVersion}/dist/umd`;
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }
  return ffmpeg;
}

/**
 * Transcodes a media Blob to HLS (single 720p fMP4 variant) and returns generated files
 */
export async function transcodeToHls(
  media: Blob,
  onProgress?: (ratio: number) => void
): Promise<HlsOutput> {
  const ff = await getFFmpeg(false);
  if (onProgress) ff.on('progress', ({ progress }) => onProgress(Math.min(0.99, progress)));

  const inputName = 'input';
  const inputExt = inferExt(media.type) || 'mp4';
  const inputFile = `${inputName}.${inputExt}`;

  // Write input to FS
  const data = await fetchFile(media);
  await ff.writeFile(inputFile, data);

  const variantName = 'v720p.m3u8';
  const initName = 'v720p_init.mp4';
  const segPattern = 'v720p_%03d.m4s';
  const masterName = 'master.m3u8';

  const width = 1280;
  const height = 720;
  const vBitrate = 2000; // kbps approximate
  const aBitrate = 128; // kbps

  // Build HLS fMP4 single-variant
  await ff.exec([
    '-i', inputFile,
    '-vf', `scale=w=${width}:h=-2:force_original_aspect_ratio=decrease`,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', `${aBitrate}k`,
    '-ac', '2',
    '-ar', '48000',
    '-keyint_min', '48',
    '-g', '48',
    '-sc_threshold', '0',
    '-hls_time', '4',
    '-hls_playlist_type', 'vod',
    '-hls_segment_type', 'fmp4',
    '-hls_fmp4_init_filename', initName,
    '-hls_flags', 'independent_segments',
    '-hls_segment_filename', segPattern,
    variantName,
  ]);

  // Read variant playlist and parse referenced files
  const variantU8 = (await ff.readFile(variantName)) as Uint8Array;
  const variantText = new TextDecoder().decode(variantU8);
  const referenced = parseHlsFiles(variantText);
  referenced.add(variantName);
  referenced.add(initName);

  // Create a simple master playlist referencing single variant
  const master = buildMasterPlaylist({
    variant: variantName,
    width,
    height,
    bandwidth: (vBitrate + aBitrate) * 1000,
  });
  const masterUint8 = new TextEncoder().encode(master);
  await ff.writeFile(masterName, masterUint8);
  referenced.add(masterName);

  // Collect outputs
  const files: Record<string, Uint8Array> = {};
  for (const f of referenced) {
    const buf = (await ff.readFile(f)) as Uint8Array;
    files[f] = buf;
  }

  onProgress?.(1);

  return {
    files,
    masterName,
    variantName,
    resolution: { width, height, label: '720p' },
    approxBitrate: (vBitrate + aBitrate) * 1000,
  };
}

function buildMasterPlaylist({ variant, width, height, bandwidth }: { variant: string; width: number; height: number; bandwidth: number }) {
  const avg = Math.floor(bandwidth * 0.85);
  return [
    '#EXTM3U',
    '#EXT-X-VERSION:7',
    `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},AVERAGE-BANDWIDTH=${avg},RESOLUTION=${width}x${height},CODECS="avc1.64001f,mp4a.40.2"`,
    variant,
    ''
  ].join('\n');
}

function parseHlsFiles(playlist: string) {
  const files = new Set<string>();
  const lines = playlist.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#')) {
      // capture init map
      if (line.startsWith('#EXT-X-MAP')) {
        const m = line.match(/URI="([^"]+)"/);
        if (m?.[1]) files.add(m[1]);
      }
      continue;
    }
    files.add(line.trim());
  }
  return files;
}

function inferExt(mime?: string | null) {
  if (!mime) return null;
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('matroska')) return 'mkv';
  if (mime.includes('mpeg')) return 'mpg';
  return null;
}
