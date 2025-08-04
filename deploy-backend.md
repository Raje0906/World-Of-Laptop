# Backend Deployment Guide

## Quick Fix for CORS Issue

The CORS configuration has been updated to allow requests from Vercel domains. To deploy these changes to Render:

### Option 1: Git Push (Recommended)
```bash
# Commit the changes
git add .
git commit -m "Fix CORS configuration - allow Vercel domains"
git push origin main

# Render will automatically redeploy
```

### Option 2: Manual Deploy
If you have Render CLI installed:
```bash
# Deploy directly to Render
render deploy
```

### Option 3: Render Dashboard
1. Go to your Render dashboard
2. Find your backend service
3. Click "Manual Deploy" → "Deploy latest commit"

## What Changed
- ✅ Allow all `vercel.app` domains
- ✅ Allow all `onrender.com` domains  
- ✅ Allow all `localhost` domains
- ✅ Added explicit CORS headers as fallback
- ✅ Added detailed logging for debugging

## Expected Result
After deployment, your frontend at `https://world-of-laptop.vercel.app` should be able to:
- ✅ Login successfully
- ✅ Fetch stores
- ✅ Access all API endpoints
- ✅ Work without CORS errors

## Test the Fix
After deployment, test these endpoints:
- `https://world-of-laptop.onrender.com/api/health`
- `https://world-of-laptop.onrender.com/api/test-cors`

Both should return successful responses with proper CORS headers. 