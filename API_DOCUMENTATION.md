# Transcoding API Documentation

## Overview
This API provides a scalable video/audio transcoding service with HLS/DASH output, multi-resolution support, and adaptive bitrate streaming. The system is designed to handle 25,000+ concurrent transcoding jobs with collective sizes of 5TB+.

## Base URL
```
https://jemnukjewyzrelauapfp.supabase.co
```

## Authentication
All API requests require authentication using Supabase Auth. Include the user's JWT token in the Authorization header:

```bash
Authorization: Bearer <USER_JWT_TOKEN>
```

## Endpoints

### 1. Upload Media File

**Endpoint:** `POST /storage/v1/object/source-files/{user_id}/{filename}`

**Description:** Upload a source media file to be transcoded.

**Headers:**
```
Authorization: Bearer <USER_JWT_TOKEN>
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbW51a2pld3l6cmVsYXVhcGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTEyNzQsImV4cCI6MjA3NTQ4NzI3NH0.iUFDv865UX72L9ZOb5Nra6zLe7XofOBSPyji9_OTwLg
Content-Type: video/mp4 (or appropriate media type)
```

**Request Body:** Binary file data

**Response:**
```json
{
  "Key": "user_id/timestamp.mp4",
  "Id": "uuid"
}
```

**Supported Formats:**
- Video: MP4, MOV, MKV, WebM
- Audio: MP3, AAC

---

### 2. Create Transcoding Job

**Endpoint:** `POST /rest/v1/transcoding_jobs`

**Description:** Create a new transcoding job for uploaded media.

**Headers:**
```
Authorization: Bearer <USER_JWT_TOKEN>
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbW51a2pld3l6cmVsYXVhcGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTEyNzQsImV4cCI6MjA3NTQ4NzI3NH0.iUFDv865UX72L9ZOb5Nra6zLe7XofOBSPyji9_OTwLg
Content-Type: application/json
Prefer: return=representation
```

**Request Body:**
```json
{
  "user_id": "uuid",
  "original_filename": "video.mp4",
  "input_file_url": "https://jemnukjewyzrelauapfp.supabase.co/storage/v1/object/public/source-files/user_id/file.mp4",
  "output_format": "hls",
  "priority": 5
}
```

**Parameters:**
- `user_id` (required): UUID of authenticated user
- `original_filename` (required): Original filename
- `input_file_url` (required): Public URL of uploaded file
- `output_format` (required): Output format - `hls` or `dash`
- `priority` (optional): Priority level 1-10, default 5

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
  "created_at": "2025-10-16T04:00:00Z"
}
```

---

### 3. Start Transcoding

**Endpoint:** `POST /functions/v1/start-transcode`

**Description:** Trigger transcoding process for a pending job.

**Headers:**
```
Authorization: Bearer <USER_JWT_TOKEN>
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbW51a2pld3l6cmVsYXVhcGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTEyNzQsImV4cCI6MjA3NTQ4NzI3NH0.iUFDv865UX72L9ZOb5Nra6zLe7XofOBSPyji9_OTwLg
Content-Type: application/json
```

**Request Body:**
```json
{
  "jobId": "job-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transcoding started",
  "jobId": "job-uuid"
}
```

**Rate Limiting:** 10 requests per minute per user

---

### 4. Get Job Status

**Endpoint:** `GET /rest/v1/transcoding_jobs?id=eq.{job_id}&select=*`

**Description:** Retrieve status and details of a transcoding job.

**Headers:**
```
Authorization: Bearer <USER_JWT_TOKEN>
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbW51a2pld3l6cmVsYXVhcGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTEyNzQsImV4cCI6MjA3NTQ4NzI3NH0.iUFDv865UX72L9ZOb5Nra6zLe7XofOBSPyji9_OTwLg
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
    "output_url": "https://jemnukjewyzrelauapfp.supabase.co/storage/v1/object/public/transcoded-outputs/master.m3u8",
    "resolution_variants": [
      {
        "resolution": "2160p",
        "width": 3840,
        "height": 2160,
        "bitrate": 15000000,
        "url": "https://.../2160p/playlist.m3u8",
        "size_bytes": 524288000
      },
      {
        "resolution": "1080p",
        "width": 1920,
        "height": 1080,
        "bitrate": 8000000,
        "url": "https://.../1080p/playlist.m3u8",
        "size_bytes": 262144000
      }
    ],
    "total_size_bytes": 1073741824,
    "estimated_duration": 120,
    "error_message": null,
    "created_at": "2025-10-16T04:00:00Z",
    "updated_at": "2025-10-16T04:05:00Z"
  }
]
```

**Job Status Values:**
- `pending`: Job created, waiting to start
- `processing`: Actively transcoding
- `completed`: Successfully completed
- `failed`: Failed with error

---

### 5. List User Jobs

**Endpoint:** `GET /rest/v1/transcoding_jobs?select=*&order=created_at.desc`

**Description:** Get all transcoding jobs for authenticated user.

**Headers:**
```
Authorization: Bearer <USER_JWT_TOKEN>
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbW51a2pld3l6cmVsYXVhcGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTEyNzQsImV4cCI6MjA3NTQ4NzI3NH0.iUFDv865UX72L9ZOb5Nra6zLe7XofOBSPyji9_OTwLg
```

**Query Parameters:**
- `status=eq.pending` - Filter by status
- `limit=10` - Limit results
- `offset=0` - Pagination offset

**Response:** Array of job objects (same structure as Get Job Status)

---

### 6. Delete Job

**Endpoint:** `DELETE /rest/v1/transcoding_jobs?id=eq.{job_id}`

**Description:** Delete a transcoding job.

**Headers:**
```
Authorization: Bearer <USER_JWT_TOKEN>
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbW51a2pld3l6cmVsYXVhcGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTEyNzQsImV4cCI6MjA3NTQ4NzI3NH0.iUFDv865UX72L9ZOb5Nra6zLe7XofOBSPyji9_OTwLg
```

**Response:** 204 No Content

---

## Realtime Updates

Subscribe to job status updates using Supabase Realtime:

```javascript
const channel = supabase
  .channel('transcoding_jobs_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'transcoding_jobs',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Job updated:', payload.new)
    }
  )
  .subscribe()
```

---

## Output Formats

### HLS (HTTP Live Streaming)
- Master playlist: `master.m3u8`
- Multi-resolution support with adaptive bitrate switching
- Resolutions: 360p, 480p, 720p, 1080p, 1440p, 2160p
- Automatic quality switching based on bandwidth

### DASH (Dynamic Adaptive Streaming over HTTP)
- Manifest file: `manifest.mpd`
- Same resolution variants as HLS
- Industry-standard format

---

## Resolution Variants

All transcoded videos include multiple resolutions:

| Resolution | Width x Height | Bitrate (Mbps) | Use Case |
|------------|----------------|----------------|----------|
| 360p | 640 x 360 | 1 | Low bandwidth |
| 480p | 854 x 480 | 2.5 | Mobile |
| 720p | 1280 x 720 | 5 | HD Standard |
| 1080p | 1920 x 1080 | 8 | Full HD |
| 1440p | 2560 x 1440 | 12 | 2K |
| 2160p | 3840 x 2160 | 15 | 4K |

---

## JavaScript SDK Integration

### Installation
```bash
npm install @supabase/supabase-js
```

### Initialize Client
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jemnukjewyzrelauapfp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbW51a2pld3l6cmVsYXVhcGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTEyNzQsImV4cCI6MjA3NTQ4NzI3NH0.iUFDv865UX72L9ZOb5Nra6zLe7XofOBSPyji9_OTwLg'
)
```

### Complete Workflow Example
```javascript
// 1. Authenticate user
const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// 2. Upload file
const file = document.querySelector('input[type="file"]').files[0]
const fileName = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('source-files')
  .upload(fileName, file)

// 3. Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('source-files')
  .getPublicUrl(fileName)

// 4. Create transcoding job
const { data: job, error: jobError } = await supabase
  .from('transcoding_jobs')
  .insert({
    user_id: user.id,
    original_filename: file.name,
    input_file_url: publicUrl,
    output_format: 'hls'
  })
  .select()
  .single()

// 5. Start transcoding
const { data, error } = await supabase.functions.invoke('start-transcode', {
  body: { jobId: job.id }
})

// 6. Monitor progress with realtime
const channel = supabase
  .channel('job_updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'transcoding_jobs',
      filter: `id=eq.${job.id}`
    },
    (payload) => {
      console.log(`Progress: ${payload.new.progress}%`)
      
      if (payload.new.status === 'completed') {
        console.log('Transcode complete!')
        console.log('Output URL:', payload.new.output_url)
        console.log('Resolutions:', payload.new.resolution_variants)
      }
    }
  )
  .subscribe()
```

---

## Video Player Integration

### Using Video.js (Recommended)
```html
<link href="https://vjs.zencdn.net/8.23.4/video-js.css" rel="stylesheet" />
<script src="https://vjs.zencdn.net/8.23.4/video.min.js"></script>

<video id="player" class="video-js vjs-default-skin" controls></video>

<script>
  const player = videojs('player', {
    sources: [{
      src: 'https://jemnukjewyzrelauapfp.supabase.co/storage/v1/object/public/transcoded-outputs/master.m3u8',
      type: 'application/x-mpegURL'
    }],
    fluid: true,
    responsive: true
  })
</script>
```

### Using HLS.js
```javascript
import Hls from 'hls.js'

const video = document.getElementById('video')
const videoSrc = 'https://.../master.m3u8'

if (Hls.isSupported()) {
  const hls = new Hls()
  hls.loadSource(videoSrc)
  hls.attachMedia(video)
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  video.src = videoSrc
}
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

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | User doesn't own this resource |
| `NOT_FOUND` | 404 | Job or resource not found |
| `INVALID_FORMAT` | 400 | Unsupported file format |
| `FILE_TOO_LARGE` | 400 | File exceeds size limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `TRANSCODE_FAILED` | 500 | Transcoding process failed |

---

## Rate Limits

- **start-transcode function**: 10 requests/minute per user
- **API requests**: 100 requests/second per user
- **File uploads**: 5GB max file size
- **Storage**: Based on your Supabase plan

---

## Best Practices

1. **File Size Optimization**
   - Compress source files before upload
   - Use appropriate codecs (H.264 for video, AAC for audio)

2. **Polling Strategy**
   - Use Realtime subscriptions instead of polling
   - If polling needed, use exponential backoff starting at 5 seconds

3. **Error Handling**
   - Always check job status before playback
   - Implement retry logic for failed jobs
   - Monitor `error_message` field for debugging

4. **Performance**
   - Use CDN for serving transcoded outputs
   - Cache job status on client side
   - Batch multiple file uploads when possible

5. **Security**
   - Always authenticate requests
   - Never expose API keys in client code
   - Use Row Level Security policies (already implemented)

---

## Support

For issues or questions:
- Check job `error_message` field for details
- Review edge function logs in Supabase dashboard
- Contact support with job ID for assistance

---

## Changelog

**v1.0.0** (2025-10-16)
- Initial release
- HLS/DASH output support
- Multi-resolution transcoding
- Adaptive bitrate streaming
- Real-time job monitoring
- 25,000+ concurrent job capacity
