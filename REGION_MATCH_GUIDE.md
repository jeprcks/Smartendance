# Region Matching Guide - MongoDB & Vercel ✅

## Why Region Matching Matters

**If regions don't match:**
- MongoDB in Singapore → Vercel in US
- **Every request travels across continents**
- Adds **1-3 seconds latency** ⚠️
- Makes your app feel slow

**If regions match:**
- Both in Singapore (closest to Philippines)
- **Same data center = minimal latency**
- Requests are **100-300ms** ✅
- Much faster!

---

## Step 1: Check MongoDB Atlas Region

### Method 1: MongoDB Atlas Dashboard

1. Go to https://cloud.mongodb.com/
2. Log in to your account
3. Click on your cluster: **"personalproject"**
4. Look at the **"Region"** field
   - Example: `Singapore (ap-southeast-1)`
   - Or: `US East (us-east-1)`

### Method 2: From Connection String

Your connection string contains region info:
```
mongodb+srv://jepoy:jepoy1234@personalproject.e5gjlwk.mongodb.net/...
```

The cluster name `personalproject.e5gjlwk` doesn't show region directly, but:
- Check MongoDB Atlas dashboard for exact region
- Or look at cluster details → "Cloud Provider & Region"

### Method 3: Check Cluster Details

1. MongoDB Atlas → Clusters
2. Click on your cluster
3. Look for **"Cloud Provider & Region"**
4. Should show: `AWS / ap-southeast-1 (Singapore)`

---

## Step 2: Check Vercel Deployment Region

### Method 1: Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project: **"smartendance"** or **"smartendance-lilac"**
3. Go to **Settings** → **General**
4. Scroll to **"Region"** section
5. Check current region:
   - Example: `Washington, D.C., USA (iad1)` ⚠️
   - Or: `Singapore (sin1)` ✅

### Method 2: From Build Logs

1. Vercel Dashboard → Deployments
2. Click on latest deployment
3. Check build logs:
   ```
   Running build in Washington, D.C., USA (East) – iad1
   ```
   This shows the region!

### Method 3: Check Function Logs

1. Vercel Dashboard → Functions
2. Click on any function
3. Check logs for region info
4. Or look at deployment details

---

## Step 3: Change Vercel Region to Singapore

### Option 1: Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **General**
4. Scroll to **"Region"** section
5. Click **"Edit"** or **"Change Region"**
6. Select: **Singapore (sin1)** or **Asia Pacific (Singapore)**
7. Click **"Save"**
8. **Redeploy** your project:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

### Option 2: vercel.json Configuration

Add region to `vercel.json`:

**For Server (backend):**
```json
{
  "version": 2,
  "regions": ["sin1"],
  "rewrites": [{ "source": "/(.*)", "destination": "/api" }]
}
```

**For Admin Web (frontend):**
Create `adminweb/vercel.json`:
```json
{
  "version": 2,
  "regions": ["sin1"]
}
```

**Note:** `sin1` = Singapore region code

### Option 3: Environment Variable (Advanced)

Set in Vercel Dashboard → Settings → Environment Variables:
```
VERCEL_REGION=sin1
```

---

## Step 4: Verify Regions Match

### Quick Test:

1. **Check MongoDB:** Should show `Singapore (ap-southeast-1)`
2. **Check Vercel:** Should show `Singapore (sin1)` or `Asia Pacific (Singapore)`
3. **Both match?** ✅ Perfect!

### Latency Test:

1. Make API request from Philippines
2. Check response time:
   - **Before (mismatch):** 1-3 seconds
   - **After (match):** 100-300ms ✅

### Ping Test:

```bash
# Test MongoDB latency
ping personalproject.e5gjlwk.mongodb.net

# Test Vercel latency  
ping smartendance-lilac.vercel.app
```

Both should show similar ping times if regions match.

---

## Region Codes Reference

| Region | Vercel Code | MongoDB Code | Best For |
|--------|-------------|--------------|----------|
| **Hong Kong** | `hkg1` | `ap-east-1` | **Philippines** ✅ (Current) |
| Singapore | `sin1` | `ap-southeast-1` | Philippines (alternative) |
| US East | `iad1` | `us-east-1` | US East Coast |
| US West | `sfo1` | `us-west-1` | US West Coast |
| Europe | `fra1` | `eu-central-1` | Europe |
| Tokyo | `hnd1` | `ap-northeast-1` | Japan |

**Current Setup:** **Hong Kong (hkg1)** - matches MongoDB free tier! ✅

---

## Step-by-Step: Change Vercel to Singapore

### Complete Process:

1. **Check MongoDB Region:**
   - MongoDB Atlas → Clusters → Your cluster
   - Note the region (should be Singapore)

2. **Change Vercel Region:**
   - Vercel Dashboard → Project → Settings → General
   - Find "Region" section
   - Change to: **Singapore (sin1)**
   - Save

3. **Redeploy:**
   - Deployments tab → Latest deployment
   - Click "..." → "Redeploy"
   - Wait for deployment to complete

4. **Verify:**
   - Check build logs: Should say "Singapore"
   - Test API speed: Should be much faster!

---

## Expected Performance Improvement

### Before (Region Mismatch):
```
MongoDB: Singapore
Vercel: US East
Latency: 1-3 seconds ⚠️
```

### After (Region Match):
```
MongoDB: Singapore
Vercel: Singapore  
Latency: 100-300ms ✅
Improvement: 70-90% faster! 🚀
```

---

## Troubleshooting

### Issue: Can't find Region setting in Vercel

**Solution:**
- Vercel Pro required for region selection
- Free tier: Auto-assigned (usually US)
- Upgrade to Pro ($20/mo) to choose region

### Issue: Region option not available

**Solution:**
- Some regions require Pro plan
- Singapore (sin1) available on Pro
- Check Vercel pricing page

### Issue: Still slow after matching

**Check:**
1. MongoDB cluster tier (M0 is slow)
2. Cold starts (use keep-alive)
3. Network speed at school
4. Database indexes (missing indexes slow queries)

---

## Quick Checklist

- [ ] Check MongoDB region (Atlas dashboard)
- [ ] Check Vercel region (Settings → General)
- [ ] Change Vercel to Singapore (if different)
- [ ] Redeploy Vercel project
- [ ] Verify regions match
- [ ] Test API speed (should be faster!)
- [ ] Set up keep-alive (prevent cold starts)

---

## Cost Consideration

### Free Tier Limitation:
- **Vercel Free:** Auto-assigned region (usually US)
- **Can't choose region** on free tier
- **Upgrade to Pro** ($20/mo) to select Singapore

### MongoDB Free Tier:
- **M0 Cluster:** Can choose region (including Singapore) ✅
- **No cost** to change MongoDB region
- **Recommendation:** Keep MongoDB in Singapore

---

## Recommendation

### If on Vercel Free:
1. **Keep MongoDB in Singapore** (free)
2. **Upgrade Vercel to Pro** ($20/mo) to match region
3. **Or:** Use alternative hosting (Railway, Render) that allows region selection

### If on Vercel Pro:
1. **Change Vercel region to Singapore** (sin1)
2. **Ensure MongoDB is Singapore** (ap-southeast-1)
3. **Redeploy** and enjoy fast performance!

---

## Alternative: Use Railway/Render (Free Region Selection)

If Vercel Pro is too expensive:

### Railway:
- **Free tier:** Can choose region
- **Singapore available:** ✅
- **Cost:** Free (with limits)

### Render:
- **Free tier:** Can choose region
- **Singapore available:** ✅
- **Cost:** Free (with limits)

**Migration guide available if needed!**

---

## Status: ✅ GUIDE COMPLETE

**Next Steps:**
1. Check MongoDB region (Atlas dashboard)
2. Check Vercel region (Settings)
3. Change Vercel to Singapore (if Pro plan)
4. Redeploy
5. Test performance improvement

**Expected Result:** 70-90% faster API responses! 🚀
