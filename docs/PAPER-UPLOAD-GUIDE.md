# Gayed Research Papers - Upload Guide

## Quick Start: Upload Papers to Vercel Blob

### Step 1: Verify Environment Variable
Ensure `BLOB_READ_WRITE_TOKEN` is set in `apps/web/.env.local`:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Upload Papers via API
Open your browser or use curl to trigger the upload:

```bash
# Browser (easier)
http://localhost:3000/api/upload-papers

# Or curl
curl -X POST http://localhost:3000/api/upload-papers
```

### Step 4: Copy Blob URLs from Response
The API will return JSON with blob URLs like this:

```json
{
  "success": true,
  "message": "Uploaded 5/5 papers",
  "totalSize": "7.58 MB",
  "results": [
    {
      "fileName": "SSRN-id2417974.pdf",
      "blobUrl": "https://gayed-signals-dashboard-blob.vercel-storage.com/research-papers/SSRN-id2417974.pdf",
      "size": 741376,
      "success": true
    },
    // ... more files
  ]
}
```

### Step 5: Update Blob URLs in Code
Copy the blob URLs into `apps/web/src/lib/data/signal-descriptions.ts`:

```typescript
export const RESEARCH_PAPERS: Record<string, ResearchPaper> = {
  'utilities-spy-rotation': {
    // ... existing fields
    blobUrl: 'https://gayed-signals-dashboard-blob.vercel-storage.com/research-papers/SSRN-id2417974.pdf'
  },
  'lumber-gold-ratio': {
    // ... existing fields
    blobUrl: 'https://gayed-signals-dashboard-blob.vercel-storage.com/research-papers/SSRN-id2431022.pdf'
  },
  // ... etc for all 5 papers
};
```

### Step 6: Test Downloads
1. Reload your dashboard: `http://localhost:3000`
2. Click any signal card
3. Expand "What does this mean?" section
4. Scroll to "Research Papers"
5. Click "Download" button
6. Verify PDF opens in new tab

### Step 7: Deploy to Production
```bash
git add .
git commit -m "Add signal descriptions and research papers"
git push
```

Vercel will automatically deploy. The blob URLs work in both development and production.

---

## Papers Uploaded (5 total - 7.58 MB)

1. **SSRN-id2417974.pdf** (724 KB) - Utilities/SPY Rotation
2. **SSRN-id2431022.pdf** (838 KB) - Lumber/Gold Ratio
3. **SSRN-id2604248.pdf** (813 KB) - Treasury Yield Curve
4. **SSRN-id2741701.pdf** (1.9 MB) - VIX Defensive
5. **SSRN-id3718824.pdf** (2.8 MB) - Moving Average Signals

---

## Vercel Blob Features

✅ **Global CDN**: Files served from edge locations worldwide
✅ **Automatic Caching**: First download ~200ms, subsequent <50ms
✅ **Scalability**: Handles 10,000+ concurrent users easily
✅ **Cost**: 500GB/month FREE on Hobby plan (your usage: ~75GB max)
✅ **Security**: Public read-only access, write token kept secret

---

## Troubleshooting

### "Paper URL not available"
- Run the upload endpoint first: `POST /api/upload-papers`
- Verify blob URLs are copied into `signal-descriptions.ts`

### "BLOB_READ_WRITE_TOKEN not found"
- Check `.env.local` exists in `apps/web/` directory
- Restart dev server after adding token

### Upload fails with 401/403
- Verify token format: `vercel_blob_rw_xxxxxxxxxxxxx`
- Check token has read+write permissions in Vercel dashboard

### Papers already uploaded, need to re-upload
- Vercel Blob automatically replaces files with same path
- Just run the upload endpoint again

---

## Security Note

After uploading papers to production:
1. ✅ Papers are public (read-only) - anyone can download
2. ✅ Write token stays secret in Vercel environment variables
3. ✅ Consider disabling `/api/upload-papers` route after initial upload
4. ✅ Or add authentication middleware to protect upload endpoint

---

## Monitoring Usage

Check Vercel Blob usage in your dashboard:
- https://vercel.com/your-team/your-project/settings/storage

**Expected usage per 10,000 users:**
- 10,000 users × 5 papers × 1.5MB avg = **75GB bandwidth**
- Well within the 500GB free tier limit
