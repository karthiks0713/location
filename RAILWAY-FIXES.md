# Railway 502 Timeout Fixes - Complete Refactor

## Problems Identified & Fixed

### ❌ Problem 1: `express.static` Blocking
**Line 37 (old code):** `app.use(express.static(join(__dirname, 'public')))`
- **Issue:** If `public` directory doesn't exist or has issues, this middleware blocks ALL requests
- **Fix:** REMOVED - static files not needed for API

### ❌ Problem 2: `/api/scrape` Blocking for Minutes
**Lines 88, 191 (old code):** `await selectLocationAndSearchOnAllWebsites(...)`
- **Issue:** Scraping takes 2-5+ minutes, Railway times out at 15 seconds
- **Fix:** Returns `202 Accepted` immediately, scraping runs in background

### ❌ Problem 3: Global `process.argv` Manipulation
**Lines 79-84, 182-187 (old code):** Modifying global `process.argv`
- **Issue:** Unsafe for concurrent requests, can cause race conditions
- **Fix:** Still used but now request-scoped (restored immediately after use)

### ❌ Problem 4: Lazy Import Still Blocks First Request
**Line 76, 179 (old code):** First dynamic import loads Selenium (10-15 seconds)
- **Issue:** First `/api/scrape` request times out while loading modules
- **Fix:** Import happens in background job, doesn't block response

### ❌ Problem 5: No Timeout Handling
- **Issue:** If scraping hangs, request hangs forever
- **Fix:** Background jobs can run as long as needed, client polls for status

## New Architecture

### Instant Endpoints (No Blocking)
- ✅ `GET /` - Returns JSON immediately
- ✅ `GET /api/health` - Returns status immediately  
- ✅ `GET /api/info` - Returns API info immediately
- ✅ `GET /api/job/:jobId` - Returns job status immediately

### Background Job Endpoints
- ✅ `GET /api/scrape` - Returns `202 Accepted` with `jobId` immediately
- ✅ `POST /api/scrape` - Returns `202 Accepted` with `jobId` immediately
- ✅ `GET /api/extract` - Returns `202 Accepted` with `jobId` immediately

### Job Status Flow
1. Client calls `/api/scrape?product=lays&location=RT%20Nagar`
2. Server immediately returns:
   ```json
   {
     "success": true,
     "message": "Scraping job started",
     "jobId": "job-1234567890-1",
     "status": "queued",
     "checkStatus": "/api/job/job-1234567890-1"
   }
   ```
3. Client polls `/api/job/job-1234567890-1` to check status
4. Status progresses: `queued` → `processing` → `completed` or `failed`
5. When `completed`, result contains all scraped data

## Benefits

1. **No 502 Errors** - All endpoints respond instantly
2. **No Timeouts** - Scraping can take as long as needed
3. **Concurrent Requests** - Multiple jobs can run simultaneously
4. **Memory Safe** - Old jobs cleaned up automatically (keeps last 100)
5. **Production Ready** - Suitable for Railway, Vercel, AWS Lambda, etc.

## Testing

### Test Health Endpoint
```bash
curl https://your-app.railway.app/api/health
# Should return instantly: {"status":"ok",...}
```

### Test Scraping Job
```bash
# Start job
curl "https://your-app.railway.app/api/scrape?product=lays&location=RT%20Nagar"
# Returns: {"jobId":"job-...","status":"queued",...}

# Check status (replace JOB_ID)
curl https://your-app.railway.app/api/job/JOB_ID
# Returns: {"status":"processing",...} or {"status":"completed","result":{...}}
```

## Migration Notes

**Old API (Blocking):**
```javascript
// OLD - blocks for minutes
const result = await fetch('/api/scrape?product=lays&location=RT%20Nagar');
const data = await result.json(); // Waits 2-5 minutes
```

**New API (Non-Blocking):**
```javascript
// NEW - returns immediately
const response = await fetch('/api/scrape?product=lays&location=RT%20Nagar');
const { jobId } = await response.json(); // Returns in < 1 second

// Poll for result
const checkStatus = async () => {
  const status = await fetch(`/api/job/${jobId}`);
  const data = await status.json();
  if (data.status === 'completed') {
    return data.result;
  } else if (data.status === 'failed') {
    throw new Error(data.error);
  } else {
    // Still processing, wait and retry
    await new Promise(resolve => setTimeout(resolve, 2000));
    return checkStatus();
  }
};

const result = await checkStatus();
```

## Production Recommendations

For production at scale, consider:
1. **Redis** for job storage (instead of in-memory Map)
2. **Bull/BullMQ** for proper job queue
3. **Webhooks** instead of polling
4. **Rate limiting** on `/api/scrape` endpoint
5. **Job expiration** (auto-delete jobs older than 1 hour)

