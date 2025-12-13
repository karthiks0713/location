# Railway Deployment Guide

## Current Issue: Application Failed to Respond

If you're seeing "Application failed to respond" on Railway, follow these steps:

## Step 1: Verify Railway Configuration

1. Go to your Railway project dashboard
2. Click on your service
3. Go to **Settings** tab
4. Check **Dockerfile Path** - it should be: `Dockerfile.scraper-api`
5. If it's different, change it to `Dockerfile.scraper-api`

## Step 2: Check Build Logs

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Check the **Build Logs** for errors
4. Look for:
   - "Server started successfully"
   - Any error messages
   - Port binding issues

## Step 3: Check Runtime Logs

1. Go to **Metrics** or **Logs** tab
2. Look for:
   - "Starting Node.js server on 0.0.0.0:XXXX"
   - "Server started successfully"
   - Any error messages

## Step 4: Test the Health Endpoint

After deployment, test:
```
https://your-app.railway.app/api/health
```

Should return:
```json
{"status":"ok","message":"Scraper API is running","timestamp":"..."}
```

## Step 5: If Still Not Working

Try the minimal test server:

1. Temporarily change `Dockerfile.scraper-api` CMD to:
   ```dockerfile
   CMD ["node", "test-server.js"]
   ```

2. Push and redeploy

3. If test-server works, the issue is in scraper-api-server.js

4. If test-server doesn't work, the issue is in Railway configuration

## Common Issues

### Issue: Wrong Dockerfile
- **Fix**: Set Dockerfile Path to `Dockerfile.scraper-api` in Railway settings

### Issue: Port not set
- **Fix**: Railway automatically sets PORT, but verify in logs

### Issue: Server crashes on startup
- **Fix**: Check logs for error messages, verify all files are copied

### Issue: Timeout
- **Fix**: Server must start in < 15 seconds. Current setup should start in < 1 second.

## Verification Checklist

- [ ] Railway is using `Dockerfile.scraper-api`
- [ ] Build completes successfully
- [ ] Logs show "Server started successfully"
- [ ] `/api/health` endpoint returns 200 OK
- [ ] Root endpoint `/` returns JSON

