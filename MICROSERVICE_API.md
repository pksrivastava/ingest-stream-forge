# Transcoding Microservice API Documentation

## Overview

This document provides comprehensive API documentation for integrating the transcoding service into your microservices architecture. The service provides enterprise-grade video/audio transcoding with multi-resolution HLS/DASH output, bulk processing capabilities, and real-time status updates.

**Key Features:**
- Multi-resolution adaptive bitrate streaming (360p to 4K)
- Bulk transcoding for batch operations
- Real-time job status updates via WebSocket
- RESTful API with JWT authentication
- Production-ready architecture supporting 25K+ concurrent jobs

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  API Gateway │────▶│   Backend   │
│Application  │     │   (Auth)     │     │  Functions  │
└─────────────┘     └──────────────┘     └─────────────┘
                                                 │
                                                 ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  Job Queue   │────▶│   Workers   │
                    │   (Redis)    │     │  (FFmpeg)   │
                    └──────────────┘     └─────────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │   Storage   │
                                          │  + CDN      │
                                          └─────────────┘
```

---

## Base Configuration

### Endpoint
```
Base URL: https://jemnukjewyzrelauapfp.supabase.co
```

### Authentication
All API requests require JWT authentication:
```
Authorization: Bearer <JWT_TOKEN>
```

Obtain JWT token through authentication endpoint:
```bash
POST /auth/v1/token
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

---

## API Endpoints

### 1. Upload Media File

Upload source media file for transcoding.

**Endpoint:** `POST /storage/v1/object/source-files/{user_id}/{filename}`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: video/mp4
```

**Request:**
```bash
curl -X POST \
  "https://jemnukjewyzrelauapfp.supabase.co/storage/v1/object/source-files/{user_id}/{filename}" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: video/mp4" \
  --data-binary "@/path/to/video.mp4"
```

**Response:**
```json
{
  "Key": "source-files/{user_id}/{filename}",
  "Id": "unique-upload-id"
}
```

---

### 2. Create Transcoding Job

Create a new transcoding job after uploading media.

**Endpoint:** `POST /rest/v1/transcoding_jobs`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
Prefer: return=representation
```

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "original_filename": "video.mp4",
  "input_file_url": "https://jemnukjewyzrelauapfp.supabase.co/storage/v1/object/public/source-files/{user_id}/{filename}",
  "output_format": "hls",
  "priority": 5
}
```

**Request Example:**
```bash
curl -X POST \
  "https://jemnukjewyzrelauapfp.supabase.co/rest/v1/transcoding_jobs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "user_id": "user-uuid",
    "original_filename": "video.mp4",
    "input_file_url": "https://...",
    "output_format": "hls",
    "priority": 5
  }'
```

**Response:**
```json
{
  "id": "job-uuid",
  "user_id": "user-uuid",
  "original_filename": "video.mp4",
  "input_file_url": "https://...",
  "output_format": "hls",
  "status": "pending",
  "progress": 0,
  "priority": 5,
  "retry_count": 0,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

---

### 3. Start Transcoding (Single Job)

Trigger transcoding for a single job.

**Endpoint:** `POST /functions/v1/start-transcode`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "jobId": "job-uuid"
}
```

**Request Example:**
```bash
curl -X POST \
  "https://jemnukjewyzrelauapfp.supabase.co/functions/v1/start-transcode" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "job-uuid"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Transcoding started",
  "jobId": "job-uuid"
}
```

---

### 4. Start Bulk Transcoding

Trigger transcoding for multiple jobs simultaneously.

**Endpoint:** `POST /functions/v1/bulk-transcode`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "jobIds": [
    "job-uuid-1",
    "job-uuid-2",
    "job-uuid-3"
  ]
}
```

**Limits:**
- Maximum 100 jobs per batch
- All jobs must be in "pending" status
- All jobs must belong to authenticated user

**Request Example:**
```bash
curl -X POST \
  "https://jemnukjewyzrelauapfp.supabase.co/functions/v1/bulk-transcode" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobIds": ["job-uuid-1", "job-uuid-2", "job-uuid-3"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk transcoding started: 3 succeeded, 0 failed",
  "total": 3,
  "successful": 3,
  "failed": 0,
  "failedJobs": []
}
```

---

### 5. Get Job Status

Retrieve status and details of a specific transcoding job.

**Endpoint:** `GET /rest/v1/transcoding_jobs?id=eq.{job_id}&select=*`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
apikey: YOUR_ANON_KEY
```

**Request Example:**
```bash
curl -X GET \
  "https://jemnukjewyzrelauapfp.supabase.co/rest/v1/transcoding_jobs?id=eq.job-uuid&select=*" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY"
```

**Response:**
```json
[
  {
    "id": "job-uuid",
    "user_id": "user-uuid",
    "original_filename": "video.mp4",
    "input_file_url": "https://...",
    "output_format": "hls",
    "status": "completed",
    "progress": 100,
    "output_url": "https://.../master.m3u8",
    "resolution_variants": [
      {
        "resolution": "2160p",
        "width": 3840,
        "height": 2160,
        "bitrate": 20000000,
        "url": "https://.../2160p.m3u8",
        "size_bytes": 450000000
      },
      {
        "resolution": "1080p",
        "width": 1920,
        "height": 1080,
        "bitrate": 8000000,
        "url": "https://.../1080p.m3u8",
        "size_bytes": 180000000
      },
      {
        "resolution": "720p",
        "width": 1280,
        "height": 720,
        "bitrate": 5000000,
        "url": "https://.../720p.m3u8",
        "size_bytes": 112000000
      },
      {
        "resolution": "480p",
        "width": 854,
        "height": 480,
        "bitrate": 2500000,
        "url": "https://.../480p.m3u8",
        "size_bytes": 56000000
      },
      {
        "resolution": "360p",
        "width": 640,
        "height": 360,
        "bitrate": 1000000,
        "url": "https://.../360p.m3u8",
        "size_bytes": 22000000
      }
    ],
    "total_size_bytes": 820000000,
    "estimated_duration": 125,
    "processing_node": "edge-function",
    "priority": 5,
    "retry_count": 0,
    "error_message": null,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:02:05Z"
  }
]
```

**Status Values:**
- `pending`: Job created, waiting to start
- `processing`: Transcoding in progress
- `completed`: Successfully completed
- `failed`: Transcoding failed

---

### 6. List User Jobs

Retrieve all transcoding jobs for authenticated user.

**Endpoint:** `GET /rest/v1/transcoding_jobs?select=*&order=created_at.desc`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
apikey: YOUR_ANON_KEY
```

**Query Parameters:**
- `status=eq.pending` - Filter by status
- `order=created_at.desc` - Order by creation date
- `limit=50` - Limit results

**Request Example:**
```bash
curl -X GET \
  "https://jemnukjewyzrelauapfp.supabase.co/rest/v1/transcoding_jobs?select=*&order=created_at.desc&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY"
```

---

### 7. Delete Job

Delete a transcoding job.

**Endpoint:** `DELETE /rest/v1/transcoding_jobs?id=eq.{job_id}`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
apikey: YOUR_ANON_KEY
```

**Request Example:**
```bash
curl -X DELETE \
  "https://jemnukjewyzrelauapfp.supabase.co/rest/v1/transcoding_jobs?id=eq.job-uuid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY"
```

**Response:**
```
204 No Content
```

---

## Real-time Updates

Subscribe to job status changes using WebSocket.

### JavaScript/TypeScript Example

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Subscribe to specific job
const channel = supabase
  .channel('transcoding_jobs')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'transcoding_jobs',
      filter: `id=eq.${jobId}`
    },
    (payload) => {
      console.log('Job updated:', payload.new);
      const { status, progress, resolution_variants } = payload.new;
      
      if (status === 'completed') {
        console.log('Transcoding completed!');
      }
    }
  )
  .subscribe();

// Unsubscribe when done
channel.unsubscribe();
```

### Python Example

```python
from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def handle_job_update(payload):
    print(f"Job updated: {payload}")
    if payload['new']['status'] == 'completed':
        print("Transcoding completed!")

supabase.realtime.channel('transcoding_jobs').on(
    'postgres_changes',
    {'event': 'UPDATE', 'schema': 'public', 'table': 'transcoding_jobs'},
    handle_job_update
).subscribe()
```

---

## Output Formats

### HLS (HTTP Live Streaming)

The service generates adaptive bitrate HLS streams with multiple resolution variants.

**Master Playlist:** `master.m3u8`
```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=20000000,RESOLUTION=3840x2160
2160p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=8000000,RESOLUTION=1920x1080
1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=854x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=640x360
360p.m3u8
```

**Resolution Variants:**

| Resolution | Dimensions | Bitrate | Use Case |
|------------|------------|---------|----------|
| 2160p (4K) | 3840x2160 | 20 Mbps | Ultra HD displays |
| 1080p (FHD) | 1920x1080 | 8 Mbps | Full HD displays |
| 720p (HD) | 1280x720 | 5 Mbps | HD displays, good bandwidth |
| 480p (SD) | 854x480 | 2.5 Mbps | Standard definition |
| 360p | 640x360 | 1 Mbps | Low bandwidth, mobile |

---

## Integration Examples

### Node.js/Express Microservice

```javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Upload and create transcoding job
app.post('/api/transcode', upload.single('video'), async (req, res) => {
  try {
    const { userId } = req.body;
    const file = req.file;
    
    // Upload to storage
    const fileName = `${userId}/${Date.now()}.${file.originalname.split('.').pop()}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('source-files')
      .upload(fileName, file.buffer);
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('source-files')
      .getPublicUrl(fileName);
    
    // Create job
    const { data: job, error: jobError } = await supabase
      .from('transcoding_jobs')
      .insert({
        user_id: userId,
        original_filename: file.originalname,
        input_file_url: publicUrl,
        output_format: 'hls',
        priority: 5
      })
      .select()
      .single();
    
    if (jobError) throw jobError;
    
    // Start transcoding
    const { data, error } = await supabase.functions.invoke('start-transcode', {
      body: { jobId: job.id }
    });
    
    if (error) throw error;
    
    res.json({
      success: true,
      jobId: job.id,
      message: 'Transcoding started'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk transcoding
app.post('/api/transcode/bulk', async (req, res) => {
  try {
    const { jobIds } = req.body;
    
    const { data, error } = await supabase.functions.invoke('bulk-transcode', {
      body: { jobIds }
    });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check job status
app.get('/api/transcode/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const { data, error } = await supabase
      .from('transcoding_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Microservice running on port 3000'));
```

### Python FastAPI Microservice

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from supabase import create_client, Client
from typing import List
import os

app = FastAPI()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

@app.post("/api/transcode")
async def create_transcode_job(
    user_id: str,
    video: UploadFile = File(...)
):
    try:
        # Upload to storage
        file_name = f"{user_id}/{int(time.time())}.{video.filename.split('.')[-1]}"
        file_data = await video.read()
        
        supabase.storage.from_("source-files").upload(file_name, file_data)
        
        # Get public URL
        public_url = supabase.storage.from_("source-files").get_public_url(file_name)
        
        # Create job
        job = supabase.table("transcoding_jobs").insert({
            "user_id": user_id,
            "original_filename": video.filename,
            "input_file_url": public_url,
            "output_format": "hls",
            "priority": 5
        }).execute()
        
        # Start transcoding
        result = supabase.functions.invoke("start-transcode", {
            "body": {"jobId": job.data[0]["id"]}
        })
        
        return {
            "success": True,
            "jobId": job.data[0]["id"],
            "message": "Transcoding started"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/transcode/bulk")
async def bulk_transcode(job_ids: List[str]):
    try:
        result = supabase.functions.invoke("bulk-transcode", {
            "body": {"jobIds": job_ids}
        })
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/transcode/{job_id}")
async def get_job_status(job_id: str):
    try:
        job = supabase.table("transcoding_jobs").select("*").eq("id", job_id).single().execute()
        return job.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing JWT token |
| `INVALID_JOB_ID` | 400 | Job ID format invalid |
| `JOB_NOT_FOUND` | 404 | Job doesn't exist or access denied |
| `INVALID_STATUS` | 400 | Job not in correct status |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `BATCH_TOO_LARGE` | 400 | Bulk request exceeds 100 jobs |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/functions/v1/start-transcode` | 10 req | 1 minute |
| `/functions/v1/bulk-transcode` | 5 req | 1 minute |
| `/rest/v1/transcoding_jobs` (GET) | 60 req | 1 minute |
| `/rest/v1/transcoding_jobs` (POST) | 30 req | 1 minute |
| `/storage/v1/object` | 100 req | 1 minute |

---

## Production Architecture

For enterprise deployment supporting 25K+ concurrent jobs:

### Infrastructure Requirements

1. **Worker Cluster (Kubernetes)**
   - 500-1000 CPU-optimized nodes
   - Auto-scaling based on queue depth
   - Spot instances for cost optimization
   - FFmpeg in Docker containers

2. **Job Queue (Redis + BullMQ)**
   - Redis cluster for high availability
   - Priority-based job scheduling
   - Retry logic and dead letter queues

3. **Storage Architecture**
   - S3-compatible object storage
   - CDN (CloudFlare/CloudFront) integration
   - Lifecycle policies for content management
   - Multi-region replication

4. **Monitoring**
   - Prometheus + Grafana for metrics
   - Sentry for error tracking
   - Custom dashboards for job metrics

### Deployment Guide

See `PRODUCTION_DEPLOYMENT.md` for detailed implementation guide including:
- FFmpeg multi-resolution pipeline
- Worker implementation
- Kubernetes deployment manifests
- Monitoring setup
- Cost optimization strategies

---

## Best Practices

1. **File Optimization**
   - Upload files in supported formats (MP4, MOV, MP3, MKV, WebM)
   - Compress large files before upload
   - Use appropriate video codecs (H.264, H.265)

2. **Polling Strategy**
   - Use WebSocket subscriptions for real-time updates
   - If polling, use exponential backoff (5s, 10s, 20s, 40s)
   - Unsubscribe from channels when done

3. **Error Handling**
   - Implement retry logic with exponential backoff
   - Log failed jobs for debugging
   - Monitor retry counts to detect recurring issues

4. **Bulk Processing**
   - Batch jobs in groups of 50-100
   - Implement queue management for large batches
   - Monitor bulk operation success rates

5. **Performance**
   - Use CDN for serving transcoded content
   - Cache master playlists
   - Implement client-side adaptive bitrate selection

6. **Security**
   - Never expose service role keys client-side
   - Validate all inputs server-side
   - Use Row Level Security (RLS) policies
   - Implement rate limiting

---

## Support

For issues or questions:
1. Check error logs in backend dashboard
2. Review job status and error messages
3. Consult this documentation
4. Contact support with job IDs and error details

---

## Changelog

### Version 1.0.0 (2025-01-15)
- Initial release
- Multi-resolution transcoding (360p-4K)
- Bulk transcoding support
- Real-time status updates
- RESTful API with JWT authentication
- Production-ready architecture documentation
