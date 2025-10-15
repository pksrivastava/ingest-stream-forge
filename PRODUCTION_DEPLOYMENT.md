# Production Deployment Guide for Enterprise-Scale Video Transcoding

This guide outlines the architecture and implementation needed to handle **25,000 simultaneous transcoding jobs** processing **5TB+ of content** with multi-resolution HLS/DASH adaptive streaming.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Client    │────▶│  Supabase    │────▶│  Job Queue      │
│  (Upload)   │     │  Edge Func   │     │  (Redis/BullMQ) │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                    │
                                                    ▼
                                          ┌─────────────────┐
                                          │  Worker Cluster │
                                          │  (Kubernetes)   │
                                          └─────────────────┘
                                                    │
                                                    ▼
                                          ┌─────────────────┐
                                          │  CDN + Storage  │
                                          │  (CloudFlare)   │
                                          └─────────────────┘
```

## 1. Infrastructure Requirements

### Worker Cluster (Kubernetes)
- **Node Count**: 500-1000 worker nodes (50 concurrent jobs per node)
- **Instance Type**: CPU-optimized (c6i.4xlarge or equivalent)
- **Auto-scaling**: Scale based on queue depth
- **Spot Instances**: Use for 70-80% cost reduction
- **Geographic Distribution**: Deploy in multiple regions for latency

### Storage Architecture
- **Primary Storage**: S3-compatible (5TB+ capacity)
- **CDN**: CloudFlare or AWS CloudFront
- **Lifecycle Policies**: Auto-archive content older than 90 days
- **Replication**: Multi-region for high availability

### Job Queue System
- **Redis Cluster**: HA setup with Sentinel or Cluster mode
- **Queue Manager**: BullMQ for job orchestration
- **Dead Letter Queue**: For failed jobs requiring manual intervention
- **Priority Levels**: 1-10 for business-critical content

## 2. FFmpeg Multi-Resolution Pipeline

### Docker Container Setup

```dockerfile
FROM jrottenberg/ffmpeg:4.4-alpine

# Install required tools
RUN apk add --no-cache \
    python3 \
    py3-pip \
    nodejs \
    npm

# Install AWS CLI for S3 uploads
RUN pip3 install awscli

WORKDIR /app
COPY transcode-worker.js .
COPY package.json .
RUN npm install

CMD ["node", "transcode-worker.js"]
```

### Multi-Resolution Transcoding Script

```javascript
// transcode-worker.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function transcodeToMultiResolution(inputUrl, jobId, userId) {
  const resolutions = [
    { name: '2160p', size: '3840x2160', bitrate: '20M', maxrate: '22M', bufsize: '44M' },
    { name: '1080p', size: '1920x1080', bitrate: '8M', maxrate: '9M', bufsize: '18M' },
    { name: '720p', size: '1280x720', bitrate: '5M', maxrate: '6M', bufsize: '12M' },
    { name: '480p', size: '854x480', bitrate: '2.5M', maxrate: '3M', bufsize: '6M' },
    { name: '360p', size: '640x360', bitrate: '1M', maxrate: '1.2M', bufsize: '2.4M' },
  ];

  // Download source file
  await execAsync(`wget -O /tmp/input.mp4 "${inputUrl}"`);

  const outputPath = `/tmp/${jobId}`;
  await execAsync(`mkdir -p ${outputPath}`);

  // Transcode all resolutions in parallel
  const transcodePromises = resolutions.map(async (res) => {
    const cmd = `ffmpeg -i /tmp/input.mp4 \
      -c:v libx264 -crf 23 -preset fast \
      -c:a aac -b:a 128k \
      -s ${res.size} \
      -b:v ${res.bitrate} \
      -maxrate ${res.maxrate} \
      -bufsize ${res.bufsize} \
      -f hls \
      -hls_time 6 \
      -hls_playlist_type vod \
      -hls_segment_filename "${outputPath}/${res.name}_%03d.ts" \
      ${outputPath}/${res.name}.m3u8`;

    await execAsync(cmd);
    
    // Upload to S3
    await execAsync(`aws s3 sync ${outputPath}/${res.name}* s3://bucket/${userId}/${jobId}/`);
    
    return {
      resolution: res.name,
      url: `https://cdn.example.com/${userId}/${jobId}/${res.name}.m3u8`,
    };
  });

  const variants = await Promise.all(transcodePromises);

  // Generate master playlist
  const masterPlaylist = generateMasterPlaylist(variants, resolutions);
  await fs.writeFile(`${outputPath}/master.m3u8`, masterPlaylist);
  await execAsync(`aws s3 cp ${outputPath}/master.m3u8 s3://bucket/${userId}/${jobId}/`);

  // Cleanup
  await execAsync(`rm -rf /tmp/input.mp4 ${outputPath}`);

  return {
    masterUrl: `https://cdn.example.com/${userId}/${jobId}/master.m3u8`,
    variants,
  };
}

function generateMasterPlaylist(variants, resolutions) {
  let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n';
  
  resolutions.forEach((res, i) => {
    const variant = variants.find(v => v.resolution === res.name);
    const bitrate = parseInt(res.bitrate) * 1000000;
    
    playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bitrate},RESOLUTION=${res.size}\n`;
    playlist += `${variant.url}\n`;
  });
  
  return playlist;
}

module.exports = { transcodeToMultiResolution };
```

## 3. Worker Implementation (Node.js + BullMQ)

```javascript
// worker.js
const { Worker } = require('bullmq');
const { transcodeToMultiResolution } = require('./transcode-worker');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const worker = new Worker('transcoding', async (job) => {
  const { jobId, inputUrl, userId } = job.data;

  console.log(`[Worker ${process.env.HOSTNAME}] Starting job ${jobId}`);

  try {
    // Update status
    await supabase
      .from('transcoding_jobs')
      .update({ 
        status: 'processing',
        processing_node: process.env.HOSTNAME 
      })
      .eq('id', jobId);

    // Transcode
    const result = await transcodeToMultiResolution(inputUrl, jobId, userId);

    // Update with results
    await supabase
      .from('transcoding_jobs')
      .update({
        status: 'completed',
        progress: 100,
        output_url: result.masterUrl,
        resolution_variants: result.variants,
      })
      .eq('id', jobId);

    console.log(`[Worker ${process.env.HOSTNAME}] Completed job ${jobId}`);
    return result;

  } catch (error) {
    console.error(`[Worker ${process.env.HOSTNAME}] Failed job ${jobId}:`, error);
    
    // Update failure status
    await supabase
      .from('transcoding_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        retry_count: job.attemptsMade,
      })
      .eq('id', jobId);

    throw error;
  }
}, {
  connection: {
    host: process.env.REDIS_HOST,
    port: 6379,
  },
  concurrency: 50, // Process 50 jobs per worker
  limiter: {
    max: 50,
    duration: 1000,
  },
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

console.log('Worker started');
```

## 4. Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: transcode-workers
spec:
  replicas: 500
  selector:
    matchLabels:
      app: transcode-worker
  template:
    metadata:
      labels:
        app: transcode-worker
    spec:
      containers:
      - name: worker
        image: your-registry/transcode-worker:latest
        resources:
          requests:
            memory: "4Gi"
            cpu: "4"
          limits:
            memory: "8Gi"
            cpu: "8"
        env:
        - name: REDIS_HOST
          value: "redis-cluster"
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: supabase-creds
              key: url
        - name: SUPABASE_SERVICE_ROLE_KEY
          valueFrom:
            secretKeyRef:
              name: supabase-creds
              key: service-role-key
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-creds
              key: access-key
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-creds
              key: secret-key

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: transcode-workers-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: transcode-workers
  minReplicas: 100
  maxReplicas: 1000
  metrics:
  - type: External
    external:
      metric:
        name: queue_depth
      target:
        type: AverageValue
        averageValue: "50"
```

## 5. Updated Edge Function (Job Enqueue)

```typescript
// supabase/functions/start-transcode/index.ts
import { Queue } from 'bullmq';

const queue = new Queue('transcoding', {
  connection: {
    host: Deno.env.get('REDIS_HOST'),
    port: 6379,
  },
});

// In your edge function:
await queue.add('transcode', {
  jobId: job.id,
  inputUrl: job.input_file_url,
  userId: job.user_id,
  priority: job.priority || 5,
}, {
  priority: job.priority || 5,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
});
```

## 6. Monitoring & Observability

### Metrics to Track
- Queue depth (pending jobs)
- Worker utilization (active/idle)
- Transcode time per resolution
- Storage usage (TB)
- CDN bandwidth (GB/day)
- Failed job rate
- Cost per transcode

### Recommended Tools
- **Prometheus + Grafana**: For metrics and dashboards
- **Sentry**: For error tracking
- **DataDog**: For APM and logs
- **PagerDuty**: For alerting

## 7. Cost Optimization

### Estimated Costs (AWS)
- **Compute (50 jobs/worker)**: ~$8,000-12,000/month (spot instances)
- **Storage (5TB)**: ~$115/month (S3 Standard)
- **CDN**: ~$800/month (CloudFlare Pro)
- **Redis**: ~$500/month (ElastiCache)
- **Total**: ~$9,500-13,500/month for 25K concurrent capacity

### Optimization Strategies
1. Use spot instances (70-80% cost reduction)
2. Archive old content to Glacier ($4/TB/month)
3. Use CloudFlare for free CDN bandwidth
4. Implement smart caching (reduce transcodes)
5. Use lower CRF for less important content

## 8. Testing & Validation

### Load Testing
```bash
# Simulate 25K jobs
for i in {1..25000}; do
  curl -X POST https://your-edge-function-url \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"jobId\": \"test-$i\"}"
done
```

### Quality Validation
- Test adaptive switching with network throttling
- Verify all resolutions play correctly
- Check audio sync across variants
- Validate master playlist compatibility

## Current Implementation Status

✅ **Implemented:**
- Secure authentication on edge functions
- UUID validation
- Rate limiting (basic)
- Multi-resolution data model
- Video.js player with adaptive streaming
- Progress tracking
- Resolution variant display

⚠️ **Production TODO:**
- Deploy Kubernetes worker cluster
- Set up Redis/BullMQ
- Implement actual FFmpeg transcoding
- Configure CDN (CloudFlare/CloudFront)
- Set up monitoring (Prometheus/Grafana)
- Implement advanced rate limiting (Redis-based)
- Add job retry logic
- Set up storage lifecycle policies

## Next Steps

1. **Phase 1**: Deploy worker cluster (100 nodes)
2. **Phase 2**: Implement FFmpeg pipeline
3. **Phase 3**: Set up CDN and storage
4. **Phase 4**: Load test with 5K concurrent
5. **Phase 5**: Scale to 25K with monitoring
6. **Phase 6**: Optimize costs and performance

---

**Note**: The current codebase provides the foundation. For production, you'll need the infrastructure described above. Contact your DevOps team to begin deployment.
