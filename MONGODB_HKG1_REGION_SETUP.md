# MongoDB Atlas Region Optimization for Hong Kong (hkg1)

## Current Setup
- **Vercel Region:** `hkg1` (Hong Kong)
- **MongoDB Optimization:** ✅ Configured for HKG1

---

## Step 1: Check Your MongoDB Atlas Cluster Region

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click **Deployments** → **Clusters**
3. Check your cluster's **Region**

---

## Step 2: Set MongoDB to Hong Kong Region (If Not Already)

### If You Need to Create a New Cluster:

1. Click **+ Create**
2. Choose **M0 (Free)** or **M2** tier
3. Under **Cloud Provider & Region:**
   - **Provider:** AWS
   - **Region:** `ap-southeast-1` (Singapore) OR `ap-northeast-1` (Tokyo)
   - **Or:** Choose `Dedicated Cluster` → Asia Pacific → Hong Kong
4. Click **Create Cluster**

### If You Have Existing Cluster in Wrong Region:

1. Go to **Cluster Settings**
2. Click **Modify Cluster**
3. Change **Region** to Hong Kong (Asia Pacific)
4. **Important:** This requires downtime (~10-30 minutes)
5. Click **Apply Changes**

---

## Recommended Regions for Best Performance

### Best (Same Region as Vercel):
- ✅ **AWS ap-southeast-1** (Singapore) - Closest to HKG1
- ✅ **AWS ap-northeast-1** (Tokyo) - Fast connection to HKG1

### Good:
- **AWS ap-south-1** (Mumbai) - Fast enough
- **AWS eu-west-1** (Ireland) - If serving EU users too

### Avoid:
- ❌ **AWS us-east-1** (N. Virginia) - Will be slow from Hong Kong
- ❌ **AWS eu-central-1** (Frankfurt) - High latency

---

## Step 3: Verify Connection String

Make sure your `MONGODB_URI` in Vercel environment variables includes your cluster URL. It should look like:

```
mongodb+srv://username:password@cluster-name.mongodb.net/smartendance?retryWrites=true&w=majority
```

1. Go to Vercel Dashboard
2. Select your **smartendance-api** project
3. Go to **Settings** → **Environment Variables**
4. Verify `MONGODB_URI` is set correctly
5. Redeploy: **Deployments** → **Redeploy**

---

## Step 4: Test Connection Speed

After deployment, test by visiting:
```
https://your-backend-domain/api/keepalive
```

You should see response time **< 500ms** (with connection reuse).

---

## Expected Performance Improvements

### Before Regional Optimization:
```
Vercel Region: Hong Kong (hkg1)
MongoDB Region: US East (us-east-1)
Connection Time: 200-400ms ⚠️
Total Request: 500-1000ms
```

### After Regional Optimization:
```
Vercel Region: Hong Kong (hkg1)
MongoDB Region: Singapore/Tokyo (ap-southeast-1)
Connection Time: 20-50ms ✅
Total Request: 100-300ms ✅✅
```

---

## MongoDB Connection Pool Settings

Your backend now uses optimized settings for HKG1:

```javascript
{
  serverSelectionTimeoutMS: 5000,    // Faster for same-region
  connectTimeoutMS: 10000,           // Connection setup
  maxPoolSize: 10,                   // Concurrent connections
  minPoolSize: 2,                    // Keep warm
  maxIdleTimeMS: 30000,              // Close idle
  family: 4,                         // IPv4 only (faster)
}
```

---

## Troubleshooting

### Problem: Still seeing 1-2 second response times
**Solution:**
1. Check MongoDB cluster region in Atlas
2. Verify it's in Asia Pacific (Singapore/Tokyo)
3. If in US/EU, create new cluster in AP region
4. Check network latency: `ping your-mongodb-cluster.mongodb.net`

### Problem: Connection timeouts
**Solution:**
1. Go to MongoDB Atlas → **Security** → **Network Access**
2. Whitelist Vercel IPs:
   - Add `0.0.0.0/0` (allows all, less secure but works)
   - OR whitelist specific Vercel regions
3. Test with `/api/keepalive` endpoint

### Problem: High CPU usage on MongoDB
**Solution:**
1. Upgrade from M0 (shared) to M2/M5 (dedicated)
2. Add database indexes
3. Optimize slow queries

---

## Quick Checklist

- [ ] MongoDB cluster is in Asia Pacific region (Singapore/Tokyo)
- [ ] `MONGODB_URI` is set in Vercel environment variables
- [ ] Backend is deployed to Vercel
- [ ] `/api/keepalive` responds in < 500ms
- [ ] Admin web frontend loads data in < 1 second
- [ ] Connection pool is working (check Vercel logs)

---

## Next Steps

1. **Verify your MongoDB region** (check Atlas dashboard)
2. **If wrong region:** Create new cluster in Singapore/Tokyo
3. **Update `MONGODB_URI`** if needed
4. **Redeploy backend** to Vercel
5. **Test performance** - should be much faster!

---

## Questions?

Check [MongoDB Atlas Regions Docs](https://www.mongodb.com/docs/atlas/reference/aws-regions/)
