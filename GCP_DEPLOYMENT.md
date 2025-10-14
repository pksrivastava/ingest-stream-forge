# GCP Media CDN Deployment Guide

This guide explains how to deploy the Media Transcoder platform to Google Cloud Platform with Media CDN integration.

## Architecture Overview

```
User Upload → Lovable Cloud Storage → Transcoding Pipeline → GCP Storage Bucket → Media CDN → End Users
```

## Prerequisites

1. Google Cloud Platform account with billing enabled
2. GCP CLI (`gcloud`) installed and configured
3. A GCP Storage bucket for transcoded outputs
4. Media CDN enabled in your GCP project

## Step 1: GCP Storage Setup

### Create a Storage Bucket

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Create a bucket for transcoded outputs
gsutil mb -p $PROJECT_ID -c STANDARD -l us-central1 gs://your-transcoded-media-bucket

# Enable uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://your-transcoded-media-bucket

# Make bucket publicly readable for streaming
gsutil iam ch allUsers:objectViewer gs://your-transcoded-media-bucket
```

### Configure CORS for Streaming

Create a `cors.json` file:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "Content-Range"
    ],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS configuration:

```bash
gsutil cors set cors.json gs://your-transcoded-media-bucket
```

## Step 2: Media CDN Configuration

### Enable Media CDN API

```bash
gcloud services enable mediacdn.googleapis.com
```

### Create Media CDN Service

```bash
# Create a backend service
gcloud compute backend-services create transcoder-backend \
  --global \
  --enable-cdn

# Add your storage bucket as a backend
gcloud compute backend-buckets create transcoder-storage-backend \
  --gcs-bucket-name=your-transcoded-media-bucket \
  --enable-cdn

# Create URL map
gcloud compute url-maps create transcoder-cdn-map \
  --default-backend-bucket=transcoder-storage-backend

# Create target HTTP proxy
gcloud compute target-http-proxies create transcoder-http-proxy \
  --url-map=transcoder-cdn-map

# Create forwarding rule
gcloud compute forwarding-rules create transcoder-cdn-rule \
  --global \
  --target-http-proxy=transcoder-http-proxy \
  --ports=80
```

### Configure CDN Cache Policy

Create a cache policy optimized for HLS/DASH streaming:

```bash
gcloud compute backend-buckets update transcoder-storage-backend \
  --cache-mode=CACHE_ALL_STATIC \
  --default-ttl=3600 \
  --max-ttl=86400 \
  --client-ttl=3600
```

## Step 3: Transcoding Pipeline Integration

### Export Transcoded Files to GCP

You have two options:

#### Option A: Modify Edge Functions to Export Directly

Update the `transcode` edge function to upload outputs directly to GCP:

1. Install GCP Storage client in your edge function
2. After transcoding completes, upload segments to GCP bucket
3. Update the job's `output_url` to point to Media CDN URL

#### Option B: Use Storage Sync

Set up a periodic sync from Lovable Cloud Storage to GCP:

```bash
# Install rclone for syncing
# Configure rclone with both Supabase and GCS
rclone sync lovable-cloud:transcoded-outputs gcs:your-transcoded-media-bucket --transfers=10
```

## Step 4: HLS/DASH Output Structure

Organize your transcoded outputs in a streaming-friendly structure:

```
gs://your-transcoded-media-bucket/
├── job-id-1/
│   ├── master.m3u8          # HLS master playlist
│   ├── manifest.mpd          # DASH manifest
│   ├── 720p/
│   │   ├── segment-0.ts
│   │   ├── segment-1.ts
│   │   └── playlist.m3u8
│   └── 1080p/
│       ├── segment-0.ts
│       ├── segment-1.ts
│       └── playlist.m3u8
└── job-id-2/
    └── ...
```

## Step 5: FFmpeg Transcoding Configuration

For production-grade HLS/DASH transcoding, use these FFmpeg commands:

### HLS (HTTP Live Streaming)

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -c:a aac \
  -b:v:0 2000k -maxrate:v:0 2000k -bufsize:v:0 4000k \
  -b:v:1 5000k -maxrate:v:1 5000k -bufsize:v:1 10000k \
  -s:v:0 1280x720 -s:v:1 1920x1080 \
  -hls_time 4 -hls_playlist_type vod \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0 v:1,a:0" \
  -hls_segment_filename "v%v/segment-%03d.ts" \
  "v%v/playlist.m3u8"
```

### DASH (Dynamic Adaptive Streaming)

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -c:a aac \
  -b:v:0 2000k -s:v:0 1280x720 \
  -b:v:1 5000k -s:v:1 1920x1080 \
  -seg_duration 4 \
  -use_template 1 -use_timeline 1 \
  -f dash manifest.mpd
```

## Step 6: Monitoring & Performance

### Set up Cloud Monitoring

```bash
# Create dashboard for CDN metrics
gcloud monitoring dashboards create --config-from-file=cdn-dashboard.yaml
```

### Key Metrics to Monitor

- Cache hit ratio
- Origin bandwidth usage
- Request latency (p50, p95, p99)
- Error rates (4xx, 5xx)
- Transcoding job completion time

## Step 7: Security Best Practices

### Secure Your Storage Bucket

```bash
# Add lifecycle policy to delete old files
gsutil lifecycle set lifecycle.json gs://your-transcoded-media-bucket

# Enable object versioning
gsutil versioning set on gs://your-transcoded-media-bucket
```

### Implement Signed URLs (Optional)

For premium content, use signed URLs:

```bash
# Generate signing key
gcloud iam service-accounts keys create key.json \
  --iam-account=cdn-signer@$PROJECT_ID.iam.gserviceaccount.com

# Configure in your application
# Use the key to generate time-limited signed URLs
```

## Cost Optimization

1. **Storage Class**: Use `STANDARD` for frequently accessed content, `NEARLINE` for archives
2. **CDN Caching**: Increase TTL for static segments to reduce origin requests
3. **Compression**: Enable gzip/brotli compression for manifest files
4. **Multi-region**: Use multi-region buckets only if needed globally

## Testing Your Deployment

### Test HLS Playback

Use a player like Video.js or hls.js:

```html
<video id="player" controls></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script>
  const video = document.getElementById('player');
  const hls = new Hls();
  hls.loadSource('https://your-cdn-url.com/job-id/master.m3u8');
  hls.attachMedia(video);
</script>
```

### Test DASH Playback

Use dash.js player:

```html
<video id="player" controls></video>
<script src="https://cdn.dashjs.org/latest/dash.all.min.js"></script>
<script>
  const player = dashjs.MediaPlayer().create();
  player.initialize(
    document.getElementById('player'),
    'https://your-cdn-url.com/job-id/manifest.mpd',
    true
  );
</script>
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Verify CORS configuration on GCP bucket
2. **404 on Segments**: Check file structure and naming conventions
3. **Slow Playback**: Verify CDN is caching properly
4. **Authentication Errors**: Ensure service account has proper permissions

### Debug Commands

```bash
# Check bucket CORS
gsutil cors get gs://your-transcoded-media-bucket

# Test CDN cache hit
curl -I https://your-cdn-url.com/job-id/master.m3u8

# View CDN logs
gcloud logging read "resource.type=http_load_balancer" --limit 50
```

## Production Checklist

- [ ] Storage bucket created and configured
- [ ] Media CDN enabled and configured
- [ ] CORS policies applied
- [ ] Cache policies optimized
- [ ] Monitoring dashboards set up
- [ ] Alert policies configured
- [ ] Cost budgets established
- [ ] Backup and disaster recovery plan
- [ ] Security policies reviewed
- [ ] Load testing completed

## Additional Resources

- [GCP Media CDN Documentation](https://cloud.google.com/media-cdn/docs)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [HLS Specification](https://datatracker.ietf.org/doc/html/rfc8216)
- [DASH Specification](https://dashif.org/docs/)

## Support

For issues with:
- **Lovable Cloud**: Check backend logs in the Cloud tab
- **GCP Services**: Use `gcloud` support commands or GCP Console
- **Transcoding**: Review FFmpeg logs and validate input files
